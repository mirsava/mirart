import React from 'react';
import { Box } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';
import { ArtTrack as ArtTrackIcon } from '@mui/icons-material';

interface ImagePlaceholderProps {
  sx?: SxProps<Theme>;
  iconSize?: number | { xs?: number; sm?: number; md?: number };
}

const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({ sx, iconSize = { xs: 28, md: 34 } }) => {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'action.hover',
        ...(sx as object),
      }}
    >
      <ArtTrackIcon sx={{ fontSize: iconSize, color: 'text.disabled' }} />
    </Box>
  );
};

export default ImagePlaceholder;
