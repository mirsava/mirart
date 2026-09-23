import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Slide,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  PhotoCamera as PhotoIcon,
  CheckCircle as DoneIcon,
  RadioButtonUnchecked as TodoIcon,
  OpenInNew as OpenIcon,
  ContentCopy as CopyIcon,
  Instagram as InstagramIcon,
  YouTube as YouTubeIcon,
  Language as WebsiteIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import apiService, { User } from '../../services/api';
import { authFetch } from '../../lib/supabase';
import SignatureInput from '../SignatureInput';

interface ProfileEditorProps {
  authUserId: string;
  isBuyer: boolean;
  checkoutEnabled: boolean;
  activeListings: number;
  onSaved?: (user: User) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const SPECIALTIES = ['Painting', 'Woodworking', 'Prints', 'Other'];
const EXPERIENCE = ['Just starting out', '1-2 years', '3-5 years', '6-10 years', '10+ years', 'Professional'];
const COUNTRIES = [
  ['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['AU', 'Australia'], ['DE', 'Germany'], ['FR', 'France'],
  ['IT', 'Italy'], ['ES', 'Spain'], ['NL', 'Netherlands'], ['BE', 'Belgium'], ['CH', 'Switzerland'], ['AT', 'Austria'],
  ['SE', 'Sweden'], ['NO', 'Norway'], ['DK', 'Denmark'], ['FI', 'Finland'], ['IE', 'Ireland'], ['NZ', 'New Zealand'],
  ['JP', 'Japan'], ['KR', 'South Korea'], ['IN', 'India'], ['BR', 'Brazil'], ['MX', 'Mexico'], ['AR', 'Argentina'],
  ['ZA', 'South Africa'], ['IL', 'Israel'], ['AE', 'United Arab Emirates'], ['SG', 'Singapore'], ['PT', 'Portugal'], ['PL', 'Poland'],
];
const countryName = (code: string) => COUNTRIES.find(([c]) => c === code)?.[1] || code;
const BIO_MIN = 40;
const BIO_MAX = 1500;

type Form = {
  profile_image_url: string;
  business_name: string;
  username: string;
  bio: string;
  specialties: string[];
  experience_level: string;
  country: string;
  website: string;
  social_instagram: string;
  social_tiktok: string;
  social_behance: string;
  social_youtube: string;
  first_name: string;
  last_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country: string;
  billing_same: boolean;
  billing_line1: string;
  billing_line2: string;
  billing_city: string;
  billing_state: string;
  billing_zip: string;
  billing_country: string;
  signature_url: string;
};

const parseSpecialties = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // plain comma-separated text
  }
  return value.split(',').map((s) => s.trim()).filter(Boolean);
};

const toForm = (u: User & Record<string, any>): Form => {
  const billingSame = !u.billing_line1 || (u.billing_line1 === u.address_line1 && u.billing_zip === u.address_zip);
  return {
    profile_image_url: u.profile_image_url || '',
    business_name: u.business_name || '',
    username: u.username || '',
    bio: u.bio || '',
    specialties: parseSpecialties(u.specialties),
    experience_level: u.experience_level || '',
    country: u.country || '',
    website: u.website || '',
    social_instagram: u.social_instagram || '',
    social_tiktok: u.social_tiktok || '',
    social_behance: u.social_behance || '',
    social_youtube: u.social_youtube || '',
    first_name: u.first_name || '',
    last_name: u.last_name || '',
    phone: u.phone || '',
    address_line1: u.address_line1 || '',
    address_line2: u.address_line2 || '',
    address_city: u.address_city || '',
    address_state: u.address_state || '',
    address_zip: u.address_zip || '',
    address_country: u.address_country || 'US',
    billing_same: billingSame,
    billing_line1: u.billing_line1 || '',
    billing_line2: u.billing_line2 || '',
    billing_city: u.billing_city || '',
    billing_state: u.billing_state || '',
    billing_zip: u.billing_zip || '',
    billing_country: u.billing_country || 'US',
    signature_url: u.signature_url || '',
  };
};

async function uploadImage(file: Blob, name: string): Promise<string> {
  const formData = new FormData();
  formData.append('image', file, name);
  const response = await authFetch(`${API_BASE_URL}/upload/image`, { method: 'POST', body: formData });
  if (!response.ok) throw new Error('Upload failed');
  const data = await response.json();
  return data.url;
}

const Section: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
    <Typography variant="h6" sx={{ fontWeight: 600 }}>{title}</Typography>
    {description && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{description}</Typography>}
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: description ? 0 : 2 }}>{children}</Box>
  </Paper>
);

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>{children}</Box>
);

// Dashboard Profile tab: public profile (what buyers see), private details, addresses (checkout only) and signature,
// with a live preview and a save bar that appears when something changed.
const ProfileEditor: React.FC<ProfileEditorProps> = ({ authUserId, isBuyer, checkoutEnabled, activeListings, onSaved }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [initial, setInitial] = useState<Form | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [email, setEmail] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiService.getUser(authUserId)
      .then((u) => {
        const f = toForm(u as User & Record<string, any>);
        setInitial(f);
        setForm(f);
        setEmail(u.email);
      })
      .catch((err) => setLoadError(err.message || 'Could not load your profile'));
  }, [authUserId]);

  // Check a changed username as the artist types
  useEffect(() => {
    if (!form || !initial) return;
    const name = form.username.trim();
    if (name === initial.username) return setUsernameStatus('idle');
    if (!/^[A-Za-z0-9_]{3,64}$/.test(name)) return setUsernameStatus('invalid');
    setUsernameStatus('checking');
    const t = setTimeout(() => {
      apiService.isUsernameAvailable(name)
        .then((ok) => setUsernameStatus(ok ? 'available' : 'taken'))
        .catch(() => setUsernameStatus('idle'));
    }, 400);
    return () => clearTimeout(t);
  }, [form?.username, initial?.username]);

  const dirty = useMemo(() => Boolean(form && initial && JSON.stringify(form) !== JSON.stringify(initial)), [form, initial]);

  if (loadError) return <Alert severity="error">{loadError}</Alert>;
  if (!form || !initial) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  const field = (key: keyof Form) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.value as never),
  });

  const displayName = form.business_name || [form.first_name, form.last_name].filter(Boolean).join(' ') || form.username || 'Your name';
  const profileUrl = initial.username ? `${window.location.origin}/artist/${initial.username}` : null;
  const checklist = [
    { label: 'Profile photo', done: Boolean(form.profile_image_url) },
    { label: `Bio of at least ${BIO_MIN} characters`, done: form.bio.trim().length >= BIO_MIN },
    { label: 'Username', done: Boolean(form.username.trim()) },
    { label: 'Website or social link', done: Boolean(form.website || form.social_instagram || form.social_tiktok || form.social_behance || form.social_youtube) },
    { label: '3 or more live listings', done: activeListings >= 3 },
  ];

  const onPhotoPicked = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      enqueueSnackbar('Please choose an image file', { variant: 'warning' });
      return;
    }
    setUploadingPhoto(true);
    try {
      set('profile_image_url', await uploadImage(file, file.name));
    } catch {
      enqueueSnackbar('Could not upload the photo. Please try again.', { variant: 'error' });
    } finally {
      setUploadingPhoto(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const save = async () => {
    if (usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking') {
      enqueueSnackbar('Please choose an available username first', { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      let signatureUrl = form.signature_url;
      if (signatureUrl.startsWith('data:')) {
        signatureUrl = await uploadImage(await (await fetch(signatureUrl)).blob(), 'signature.png');
      }
      // Only send what this form shows, so nothing else on the account is touched
      const payload: Record<string, unknown> = {
        profile_image_url: form.profile_image_url || null,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || null,
        country: form.country || null,
      };
      if (!isBuyer) {
        Object.assign(payload, {
          business_name: form.business_name || null,
          bio: form.bio || null,
          specialties: form.specialties,
          experience_level: form.experience_level || null,
          website: form.website || null,
          social_instagram: form.social_instagram || null,
          social_tiktok: form.social_tiktok || null,
          social_behance: form.social_behance || null,
          social_youtube: form.social_youtube || null,
          signature_url: signatureUrl || null,
        });
        if (form.username.trim() && form.username.trim() !== initial.username) payload.username = form.username.trim();
      }
      if (checkoutEnabled) {
        const billing = form.billing_same
          ? { line1: form.address_line1, line2: form.address_line2, city: form.address_city, state: form.address_state, zip: form.address_zip, country: form.address_country }
          : { line1: form.billing_line1, line2: form.billing_line2, city: form.billing_city, state: form.billing_state, zip: form.billing_zip, country: form.billing_country };
        Object.assign(payload, {
          address_line1: form.address_line1 || null,
          address_line2: form.address_line2 || null,
          address_city: form.address_city || null,
          address_state: form.address_state || null,
          address_zip: form.address_zip || null,
          address_country: form.address_country || 'US',
          billing_line1: billing.line1 || null,
          billing_line2: billing.line2 || null,
          billing_city: billing.city || null,
          billing_state: billing.state || null,
          billing_zip: billing.zip || null,
          billing_country: billing.country || 'US',
        });
      }
      const saved = await apiService.updateUser(authUserId, payload as any);
      const next = toForm(saved as User & Record<string, any>);
      setInitial(next);
      setForm(next);
      enqueueSnackbar('Profile saved', { variant: 'success' });
      // Lets the header refresh the avatar and name
      window.dispatchEvent(new Event('profileUpdated'));
      onSaved?.(saved);
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Could not save your profile', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const copyProfileUrl = async () => {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      enqueueSnackbar('Profile link copied', { variant: 'success' });
    } catch {
      enqueueSnackbar(profileUrl, { variant: 'info' });
    }
  };

  const usernameHelper = {
    idle: profileUrl ? `Your public page: ${profileUrl}` : 'Letters, numbers and underscores. This becomes your public profile link.',
    checking: 'Checking…',
    available: `Available. Your link will be ${window.location.origin}/artist/${form.username.trim()}. Links to your old username will stop working.`,
    taken: 'That username is taken',
    invalid: '3-64 letters, numbers or underscores',
  }[usernameStatus];

  const photo = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
      <Box sx={{ position: 'relative' }}>
        <Avatar src={form.profile_image_url || undefined} alt={displayName} sx={{ width: 96, height: 96, fontSize: '2.25rem', bgcolor: 'primary.main' }}>
          {displayName.charAt(0).toUpperCase()}
        </Avatar>
        {uploadingPhoto && (
          <CircularProgress size={96} sx={{ position: 'absolute', inset: 0 }} aria-label="Uploading photo" />
        )}
      </Box>
      <Box>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => onPhotoPicked(e.target.files?.[0])} />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small" startIcon={<PhotoIcon />} onClick={() => fileInput.current?.click()} disabled={uploadingPhoto} sx={{ textTransform: 'none' }}>
            {form.profile_image_url ? 'Change photo' : 'Upload photo'}
          </Button>
          {form.profile_image_url && (
            <Button size="small" color="inherit" onClick={() => set('profile_image_url', '')} sx={{ textTransform: 'none' }}>Remove</Button>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          A clear photo of you or your studio. Square images look best.
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ pb: dirty ? 10 : 0 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, alignItems: 'start' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          {isBuyer ? (
            <Section title="Your profile">
              {photo}
              <Row>
                <TextField label="First name" {...field('first_name')} />
                <TextField label="Last name" {...field('last_name')} />
              </Row>
            </Section>
          ) : (
            <Section title="Public profile" description="What buyers see on your artist page, on the homepage and in the weekly email.">
              {photo}
              <Row>
                <TextField label="Artist or studio name" {...field('business_name')} helperText="Shown instead of your personal name" />
                <TextField
                  label="Username"
                  {...field('username')}
                  error={usernameStatus === 'taken' || usernameStatus === 'invalid'}
                  helperText={usernameHelper}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">@</InputAdornment>,
                    endAdornment: usernameStatus === 'available' ? <InputAdornment position="end"><DoneIcon color="success" fontSize="small" /></InputAdornment> : undefined,
                  }}
                  inputProps={{ maxLength: 64 }}
                />
              </Row>
              <TextField
                label="Bio"
                multiline
                minRows={4}
                {...field('bio')}
                inputProps={{ maxLength: BIO_MAX }}
                helperText={
                  form.bio.trim().length < BIO_MIN
                    ? `A few sentences about you and your work (at least ${BIO_MIN} characters to count as complete) · ${form.bio.length}/${BIO_MAX}`
                    : `${form.bio.length}/${BIO_MAX}`
                }
              />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>What you make</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {SPECIALTIES.map((s) => {
                    const on = form.specialties.includes(s);
                    return (
                      <Chip
                        key={s}
                        label={s}
                        color={on ? 'primary' : 'default'}
                        variant={on ? 'filled' : 'outlined'}
                        onClick={() => set('specialties', on ? form.specialties.filter((x) => x !== s) : [...form.specialties, s])}
                        aria-pressed={on}
                      />
                    );
                  })}
                </Box>
              </Box>
              <Row>
                <FormControl fullWidth>
                  <InputLabel>Experience</InputLabel>
                  <Select label="Experience" value={form.experience_level} onChange={(e) => set('experience_level', e.target.value)}>
                    <MenuItem value="">Not shown</MenuItem>
                    {EXPERIENCE.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Country</InputLabel>
                  <Select label="Country" value={form.country} onChange={(e) => set('country', e.target.value)}>
                    <MenuItem value="">Not shown</MenuItem>
                    {COUNTRIES.map(([code, name]) => <MenuItem key={code} value={code}>{name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Row>
              <Typography variant="body2" sx={{ fontWeight: 600, mt: 1 }}>Links</Typography>
              <Row>
                <TextField label="Website" placeholder="https://" {...field('website')} InputProps={{ startAdornment: <InputAdornment position="start"><WebsiteIcon fontSize="small" /></InputAdornment> }} />
                <TextField label="Instagram" placeholder="@yourname or link" {...field('social_instagram')} InputProps={{ startAdornment: <InputAdornment position="start"><InstagramIcon fontSize="small" /></InputAdornment> }} />
                <TextField label="TikTok" placeholder="@yourname or link" {...field('social_tiktok')} />
                <TextField label="Behance" placeholder="Profile link" {...field('social_behance')} />
                <TextField label="YouTube" placeholder="Channel link" {...field('social_youtube')} InputProps={{ startAdornment: <InputAdornment position="start"><YouTubeIcon fontSize="small" /></InputAdornment> }} />
              </Row>
            </Section>
          )}

          <Section title="Private details" description="Only you and ArtZyla staff can see these.">
            {!isBuyer && (
              <Row>
                <TextField label="First name" {...field('first_name')} />
                <TextField label="Last name" {...field('last_name')} />
              </Row>
            )}
            <Row>
              <TextField label="Email" value={email} disabled helperText="The email you sign in with" />
              <TextField label="Phone" {...field('phone')} inputProps={{ inputMode: 'tel' }} />
            </Row>
            {isBuyer && (
              <FormControl fullWidth>
                <InputLabel>Country</InputLabel>
                <Select label="Country" value={form.country} onChange={(e) => set('country', e.target.value)}>
                  <MenuItem value="">Not set</MenuItem>
                  {COUNTRIES.map(([code, name]) => <MenuItem key={code} value={code}>{name}</MenuItem>)}
                </Select>
              </FormControl>
            )}
          </Section>

          {checkoutEnabled && (
            <Section title="Addresses" description={isBuyer ? 'Where your orders are delivered.' : 'Where buyers ship returns and where you ship from.'}>
              <TextField label="Street address" {...field('address_line1')} />
              <TextField label="Apartment, suite (optional)" {...field('address_line2')} />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' }, gap: 2 }}>
                <TextField label="City" {...field('address_city')} />
                <TextField label="State / Province" {...field('address_state')} />
                <TextField label="ZIP / Postal code" {...field('address_zip')} />
              </Box>
              <FormControlLabel
                control={<Switch checked={form.billing_same} onChange={(e) => set('billing_same', e.target.checked)} />}
                label="Billing address is the same"
              />
              {!form.billing_same && (
                <>
                  <TextField label="Billing street address" {...field('billing_line1')} />
                  <TextField label="Apartment, suite (optional)" {...field('billing_line2')} />
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' }, gap: 2 }}>
                    <TextField label="City" {...field('billing_city')} />
                    <TextField label="State / Province" {...field('billing_state')} />
                    <TextField label="ZIP / Postal code" {...field('billing_zip')} />
                  </Box>
                </>
              )}
            </Section>
          )}

          {!isBuyer && (
            <Section title="Signature" description="Shown on your artwork pages as your mark of authenticity.">
              <SignatureInput value={form.signature_url || undefined} onChange={(v) => set('signature_url', v || '')} />
            </Section>
          )}
        </Box>

        {!isBuyer && (
          <Box sx={{ position: { lg: 'sticky' }, top: { lg: 88 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <Typography variant="overline" color="text.secondary" sx={{ px: 2, pt: 1.5, display: 'block' }}>How buyers see you</Typography>
              <Box sx={{ px: 2, pb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Avatar src={form.profile_image_url || undefined} sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>{displayName.charAt(0).toUpperCase()}</Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>{displayName}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap component="div">
                      {[form.username && `@${form.username}`, form.country && countryName(form.country)].filter(Boolean).join(' · ') || 'Add a username and country'}
                    </Typography>
                  </Box>
                </Box>
                {form.specialties.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
                    {form.specialties.map((s) => <Chip key={s} size="small" variant="outlined" label={s} />)}
                  </Box>
                )}
                <Typography
                  variant="body2"
                  color={form.bio ? 'text.primary' : 'text.secondary'}
                  sx={{ fontStyle: form.bio ? 'normal' : 'italic', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {form.bio || 'Your bio will appear here.'}
                </Typography>
                {profileUrl && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                    <Button size="small" variant="outlined" endIcon={<OpenIcon fontSize="small" />} component={Link} href={`/artist/${initial.username}`} target="_blank" rel="noopener" sx={{ textTransform: 'none' }}>
                      View public page
                    </Button>
                    <Button size="small" startIcon={<CopyIcon fontSize="small" />} onClick={copyProfileUrl} sx={{ textTransform: 'none' }}>Copy link</Button>
                  </Box>
                )}
              </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Profile checklist · {checklist.filter((c) => c.done).length}/{checklist.length}
              </Typography>
              {checklist.map((c) => (
                <Box key={c.label} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25, color: c.done ? 'text.secondary' : 'text.primary' }}>
                  {c.done ? <DoneIcon color="success" fontSize="small" /> : <TodoIcon color="disabled" fontSize="small" />}
                  <Typography variant="body2">{c.label}</Typography>
                </Box>
              ))}
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Complete profiles appear in "Meet the Artists" on the homepage.
              </Typography>
            </Paper>
          </Box>
        )}
      </Box>

      {/* Save bar: only while there are unsaved changes */}
      <Box sx={{ position: 'fixed', left: 0, right: 0, bottom: 16, px: 1, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: (t) => t.zIndex.appBar }}>
        <Slide direction="up" in={dirty} mountOnEnter unmountOnExit>
          <Paper
            elevation={8}
            role="region"
            aria-label="Unsaved changes"
            sx={{ pointerEvents: 'auto', px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2, width: { xs: '100%', md: 'auto' }, minWidth: { md: 420 } }}
          >
            <Typography variant="body2" sx={{ flex: 1 }}>You have unsaved changes</Typography>
            <Button onClick={() => setForm(initial)} disabled={saving} color="inherit" sx={{ textTransform: 'none' }}>Discard</Button>
            <Button variant="contained" onClick={save} disabled={saving || uploadingPhoto} sx={{ textTransform: 'none' }}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </Paper>
        </Slide>
      </Box>
    </Box>
  );
};

export default ProfileEditor;
