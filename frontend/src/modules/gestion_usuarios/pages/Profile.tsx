import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Paper,
  Typography,
  Box,
  Divider,
  Chip,
  Button,
  Avatar,
  useTheme
} from '@mui/material';
import {
  BadgeOutlined,
  PhoneAndroidOutlined,
  PersonOutlineOutlined,
  LockResetOutlined
} from '@mui/icons-material';

import { useAuth } from '../context/AuthContext';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  if (!user) return null;

  const inactive = (user as { is_active?: boolean }).is_active === false;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Paper 
        elevation={3}
        sx={{
          maxWidth: 600,
          mx: 'auto',
          p: 4,
          borderRadius: 4,
          background: `linear-gradient(145deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`,
          position: 'relative',
          overflow: 'visible',
          '&:before': {
            content: '""',
            position: 'absolute',
            top: -8,
            left: -8,
            right: -8,
            bottom: -8,
            bgcolor: 'grey.100',
            borderRadius: 5,
            zIndex: -1
          }
        }}
      >
        {/* Header with avatar */}
        <Box display="flex" alignItems="center" gap={3} mb={4}>
            <Avatar 
            sx={{ 
              width: 80, 
              height: 80,
              bgcolor: theme.palette.secondary.main, // Using primary color
              // Other options:
              // bgcolor: theme.palette.secondary.main
              // bgcolor: theme.palette.error.main
              // bgcolor: theme.palette.warning.main
              // bgcolor: theme.palette.success.main
              // bgcolor: '#1976d2' // Or direct hex color
              fontSize: '2rem'
            }}
            >
            {user.nombre[0]}{user.apellido[0]}
            </Avatar>
          
          <Box>
            <Typography 
              variant="h4" 
              fontWeight="bold"
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
              }}
            >
              {user.nombre} {user.apellido}
              {inactive && (
                <Chip
                  label="Cuenta inactiva"
                  size="small"
                  color="warning"
                  sx={{ 
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    height: 24,
                    '& .MuiChip-label': { px: 1 }
                  }}
                />
              )}
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <BadgeOutlined fontSize="small" /> {user.role}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* Data grid */}
        <Box 
          component="dl" 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 3,
            mb: 4
          }}
        >
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Typography 
              component="dt" 
              variant="caption" 
              color="text.secondary"
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}
            >
              <PersonOutlineOutlined fontSize="small" /> Nombre completo
            </Typography>
            <Typography component="dd" fontWeight="medium">
              {user.nombre} {user.apellido}
            </Typography>
          </Box>

          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Typography 
              component="dt" 
              variant="caption" 
              color="text.secondary"
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}
            >
              <PhoneAndroidOutlined fontSize="small" /> Teléfono
            </Typography>
            <Typography component="dd" fontWeight="medium">
              {user.telefono || 'No especificado'}
            </Typography>
          </Box>
        </Box>

        {/* Action button */}
        <Box 
          display="flex" 
          justifyContent="flex-end"
          sx={{ 
            mt: 4,
            '& button:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 2
            }
          }}
        >
          <Button
            variant="contained"
            startIcon={<LockResetOutlined />}
            onClick={() => navigate('/change-password', { state: { voluntary: true } })}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 700,
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'primary.dark',
                transform: 'translateY(-2px)'
              }
            }}
          >
            Cambiar contraseña
          </Button>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default Profile;