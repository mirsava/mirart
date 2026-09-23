import React from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

// Painted-frame tiles in the same style as the hero artwork, so the section looks full with any inventory.
const TILES = [
  {
    category: 'Painting',
    label: 'Paintings',
    blurb: 'Original canvases, abstract to realism',
    art: 'radial-gradient(circle at 68% 32%, #e6a888 0 16%, transparent 17%), linear-gradient(180deg, #1f2a44 0 62%, #b5573a 62% 100%)',
  },
  {
    category: 'Prints',
    label: 'Prints',
    blurb: 'Giclée, screen and fine art prints',
    art: 'linear-gradient(90deg, #eadfce 0 50%, #b5573a 50% 74%, #1f2a44 74% 100%)',
  },
  {
    category: 'Woodworking',
    label: 'Woodworking',
    blurb: 'Furniture, decor and handmade pieces',
    art: 'repeating-linear-gradient(100deg, #8a5a3b 0 14px, #9c6a48 14px 22px, #7a4d31 22px 34px)',
  },
  {
    category: 'Other',
    label: 'One of a Kind',
    blurb: 'Work that defies a category',
    art: 'radial-gradient(ellipse at 50% 100%, #d9825f 0 45%, transparent 46%), linear-gradient(180deg, #efe6d8 0 100%)',
  },
];

const ShopByCategory: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, pt: 8 }}>
      <Typography
        variant="h4"
        component="h2"
        sx={{ fontWeight: 600, color: 'text.primary', fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }, mb: 1 }}
      >
        Shop by Category
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 800, lineHeight: 1.6 }}>
        Find the kind of work you love.
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 } }}>
        {TILES.map((tile) => (
          <ButtonBase
            key={tile.category}
            onClick={() => navigate(`/gallery?category=${encodeURIComponent(tile.category)}`)}
            sx={{
              display: 'block',
              textAlign: 'left',
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              '&:hover, &:focus-visible': { transform: 'translateY(-4px)', boxShadow: 4 },
              '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 2 },
            }}
          >
            {/* Framed "artwork" */}
            <Box sx={{ p: { xs: 1.5, md: 2 }, bgcolor: 'action.hover' }}>
              <Box
                sx={{
                  aspectRatio: '4 / 3',
                  background: tile.art,
                  border: '6px solid #f7f2ea',
                  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08), 0 6px 16px rgba(0,0,0,0.18)',
                }}
              />
            </Box>
            <Box sx={{ p: { xs: 1.5, md: 2 } }}>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>{tile.label}</Typography>
              <Typography variant="body2" color="text.secondary">{tile.blurb}</Typography>
            </Box>
          </ButtonBase>
        ))}
      </Box>
    </Box>
  );
};

export default ShopByCategory;
