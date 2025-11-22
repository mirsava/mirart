import React, { useRef, useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Tabs,
  Tab,
  IconButton,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Clear as ClearIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

interface SignatureInputProps {
  value?: string;
  onChange: (signatureUrl: string | null) => void;
  disabled?: boolean;
}

const SignatureInput: React.FC<SignatureInputProps> = ({ value, onChange, disabled = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [uploadedImage, setUploadedImage] = useState<string | null>(value || null);
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      setUploadedImage(value);
      setDrawnSignature(value);
    }
  }, [value]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveDrawnSignature();
  };

  const saveDrawnSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const croppedDataUrl = cropCanvas(canvas);
    setDrawnSignature(croppedDataUrl);
    
    try {
      const blob = await dataURLtoBlob(croppedDataUrl);
      const formData = new FormData();
      formData.append('image', blob, 'signature.png');

      const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/upload/image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload signature');
      }

      const data = await response.json();
      onChange(data.url);
    } catch (error) {
      console.error('Error uploading drawn signature:', error);
      onChange(croppedDataUrl);
    }
  };

  const dataURLtoBlob = (dataURL: string): Promise<Blob> => {
    return new Promise((resolve) => {
      const arr = dataURL.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      resolve(new Blob([u8arr], { type: mime }));
    });
  };

  const cropImage = (imageData: ImageData | HTMLCanvasElement | HTMLImageElement): string => {
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;
    let width: number;
    let height: number;
    let imageDataArray: Uint8ClampedArray;
    let sourceCanvas: HTMLCanvasElement | null = null;

    if (imageData instanceof ImageData) {
      width = imageData.width;
      height = imageData.height;
      imageDataArray = imageData.data;
      sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = width;
      sourceCanvas.height = height;
      const sourceCtx = sourceCanvas.getContext('2d')!;
      sourceCtx.putImageData(imageData, 0, 0);
    } else if (imageData instanceof HTMLCanvasElement) {
      canvas = imageData;
      ctx = canvas.getContext('2d')!;
      width = canvas.width;
      height = canvas.height;
      imageDataArray = ctx.getImageData(0, 0, width, height).data;
      sourceCanvas = canvas;
    } else {
      canvas = document.createElement('canvas');
      ctx = canvas.getContext('2d')!;
      width = imageData.width;
      height = imageData.height;
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(imageData, 0, 0);
      imageDataArray = ctx.getImageData(0, 0, width, height).data;
      sourceCanvas = canvas;
    }

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let hasContent = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = imageDataArray[idx];
        const g = imageDataArray[idx + 1];
        const b = imageDataArray[idx + 2];
        const a = imageDataArray[idx + 3];

        const brightness = (r + g + b) / 3;
        const isWhiteOrLight = brightness > 240 && a > 200;
        const isTransparent = a < 30;
        const isContent = !isWhiteOrLight && !isTransparent;

        if (isContent) {
          hasContent = true;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (!hasContent || minX > maxX || minY > maxY) {
      if (sourceCanvas) {
        return sourceCanvas.toDataURL('image/png');
      }
      return '';
    }

    const padding = 10;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width - 1, maxX + padding);
    maxY = Math.min(height - 1, maxY + padding);

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;

    if (cropWidth <= 0 || cropHeight <= 0) {
      if (sourceCanvas) {
        return sourceCanvas.toDataURL('image/png');
      }
      return '';
    }

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropWidth;
    croppedCanvas.height = cropHeight;
    const croppedCtx = croppedCanvas.getContext('2d')!;
    
    croppedCtx.fillStyle = 'transparent';
    croppedCtx.fillRect(0, 0, cropWidth, cropHeight);

    if (sourceCanvas) {
      croppedCtx.drawImage(
        sourceCanvas,
        minX, minY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );
    }

    return croppedCanvas.toDataURL('image/png');
  };

  const cropCanvas = (canvas: HTMLCanvasElement): string => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas.toDataURL('image/png');
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const cropped = cropImage(imageData);
    return cropped || canvas.toDataURL('image/png');
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setDrawnSignature(null);
    onChange(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const img = new Image();
    img.onload = async () => {
      try {
        const croppedDataUrl = cropImage(img);
        const blob = await dataURLtoBlob(croppedDataUrl);
        const formData = new FormData();
        formData.append('image', blob, 'signature.png');

        const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${API_BASE_URL}/upload/image`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload signature');
        }

        const data = await response.json();
        const signatureUrl = data.url;
        setUploadedImage(signatureUrl);
        onChange(signatureUrl);
      } catch (error) {
        console.error('Error uploading signature:', error);
        alert('Failed to upload signature');
      }
    };
    img.onerror = () => {
      alert('Failed to load image');
    };
    img.src = URL.createObjectURL(file);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (drawnSignature && tabValue === 1 && drawnSignature.startsWith('data:')) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = drawnSignature;
    } else if (drawnSignature && tabValue === 1 && !drawnSignature.startsWith('data:')) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      const baseUrl = (import.meta as any).env?.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
      img.src = baseUrl + drawnSignature;
    } else if (!drawnSignature && tabValue === 1) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'transparent';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [tabValue, drawnSignature]);

  const currentSignature = tabValue === 0 ? uploadedImage : drawnSignature;

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Signature
      </Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="Upload" disabled={disabled} />
          <Tab label="Draw" disabled={disabled} />
        </Tabs>

        {tabValue === 0 && (
          <Box>
            {currentSignature ? (
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Box
                  component="img"
                  src={currentSignature.startsWith('data:') 
                    ? currentSignature 
                    : ((import.meta as any).env?.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001') + currentSignature}
                  alt="Signature"
                  sx={{
                    maxWidth: '100%',
                    maxHeight: 200,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                />
                <IconButton
                  size="small"
                  onClick={() => {
                    setUploadedImage(null);
                    setDrawnSignature(null);
                    onChange(null);
                  }}
                  disabled={disabled}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    bgcolor: 'background.paper',
                  }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Box>
            ) : (
              <Box
                sx={{
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                }}
              >
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="signature-upload"
                  type="file"
                  onChange={handleFileUpload}
                  disabled={disabled}
                />
                <label htmlFor="signature-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<UploadIcon />}
                    disabled={disabled}
                  >
                    Upload Signature Image
                  </Button>
                </label>
              </Box>
            )}
          </Box>
        )}

        {tabValue === 1 && (
          <Box>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                position: 'relative',
                bgcolor: 'background.paper',
                mb: 2,
              }}
            >
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={(e) => {
                  e.preventDefault();
                  if (disabled) return;
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  const touch = e.touches[0];
                  const rect = canvas.getBoundingClientRect();
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;
                  const scaleX = canvas.width / rect.width;
                  const scaleY = canvas.height / rect.height;
                  setIsDrawing(true);
                  ctx.beginPath();
                  ctx.moveTo((touch.clientX - rect.left) * scaleX, (touch.clientY - rect.top) * scaleY);
                }}
                onTouchMove={(e) => {
                  e.preventDefault();
                  if (!isDrawing || disabled) return;
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  const touch = e.touches[0];
                  const rect = canvas.getBoundingClientRect();
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;
                  const scaleX = canvas.width / rect.width;
                  const scaleY = canvas.height / rect.height;
                  ctx.lineTo((touch.clientX - rect.left) * scaleX, (touch.clientY - rect.top) * scaleY);
                  ctx.stroke();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  if (isDrawing) {
                    setIsDrawing(false);
                    saveDrawnSignature();
                  }
                }}
                style={{
                  width: '100%',
                  maxWidth: 600,
                  height: 'auto',
                  cursor: disabled ? 'not-allowed' : 'crosshair',
                  display: 'block',
                  touchAction: 'none',
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={clearCanvas}
                disabled={disabled}
                size="small"
              >
                Clear
              </Button>
              {drawnSignature && (
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => {
                    const link = document.createElement('a');
                    link.download = 'signature.png';
                    link.href = drawnSignature;
                    link.click();
                  }}
                  disabled={disabled}
                  size="small"
                >
                  Download
                </Button>
              )}
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default SignatureInput;

