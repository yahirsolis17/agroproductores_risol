import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Paper,
  Typography,
  Box,
  Divider,
  Chip,
  Button,
  Avatar,
  useTheme,
  alpha
} from '@mui/material';
import {
  BadgeOutlined,
  PhoneAndroidOutlined,
  PersonOutlineOutlined,
  LockResetOutlined
} from '@mui/icons-material';

import { useAuth } from '../context/AuthContext';

interface DataItem {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  if (!user) return null;

  const inactive = (user as { is_active?: boolean }).is_active === false;

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  const dataItems: DataItem[] = [
    {
      icon: <PersonOutlineOutlined fontSize="small" />,
      label: 'Nombre completo',
      value: `${user.nombre} ${user.apellido}`
    },
    {
      icon: <PhoneAndroidOutlined fontSize="small" />,
      label: 'Teléfono',
      value: user.telefono || 'No especificado'
    }
  ];

  return (
    <AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          padding: '2rem',
          position: 'relative',
          minHeight: '100vh'
        }}
      >
        {/* Decorative background elements */}
        <Box
          sx={{
            position: 'absolute',
            top: '10%',
            left: '5%',
            width: '200px',
            height: '200px',
            background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.15)}, transparent)`,
            filter: 'blur(40px)',
            zIndex: 0
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '10%',
            right: '5%',
            width: '250px',
            height: '250px',
            background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.15)}, transparent)`,
            filter: 'blur(50px)',
            zIndex: 0
          }}
        />

        <Paper 
          elevation={0}
          sx={{
            maxWidth: 600,
            mx: 'auto',
            p: 4,
            borderRadius: '24px',
            background: alpha(theme.palette.background.paper, 0.7),
            backdropFilter: 'blur(12px)',
            border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
            position: 'relative',
            overflow: 'hidden',
            zIndex: 1,
            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.1)}`,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(135deg, 
                ${alpha(theme.palette.common.white, 0.1)} 0%, 
                ${alpha(theme.palette.common.white, 0.05)} 100%)`,
              borderRadius: '24px'
            }
          }}
        >
          {/* Header with avatar */}
          <motion.div variants={itemVariants}>
            <Box display="flex" alignItems="center" gap={3} mb={4}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Avatar 
                  sx={{ 
                    width: 90,
                    height: 90,
                    bgcolor: theme.palette.secondary.main,
                    fontSize: '2.2rem',
                    fontWeight: 'bold',
                    boxShadow: `0 8px 32px ${alpha(theme.palette.secondary.main, 0.3)}`,
                    border: `4px solid ${alpha(theme.palette.common.white, 0.8)}`,
                    transition: 'all 0.3s ease'
                  }}
                >
                  {user.nombre[0]}{user.apellido[0]}
                </Avatar>
              </motion.div>
              
              <Box>
                <Typography 
                  variant="h4" 
                  fontWeight="bold"
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    background: `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${alpha(theme.palette.text.primary, 0.8)} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  {user.nombre} {user.apellido}
                  {inactive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, delay: 0.2 }}
                    >
                      <Chip
                        label="Cuenta inactiva"
                        size="small"
                        color="warning"
                        sx={{ 
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          height: 24,
                          backdropFilter: 'blur(4px)',
                          '& .MuiChip-label': { px: 1.5 }
                        }}
                      />
                    </motion.div>
                  )}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    color: alpha(theme.palette.text.secondary, 0.9)
                  }}
                >
                  <BadgeOutlined fontSize="small" /> {user.role}
                </Typography>
              </Box>
            </Box>
          </motion.div>

          <Divider 
            sx={{ 
              mb: 4,
              background: `linear-gradient(90deg, 
                transparent 0%, 
                ${alpha(theme.palette.divider, 0.7)} 50%,
                transparent 100%
              )`,
              opacity: 0.6
            }} 
          />

          {/* Data grid */}
          <motion.div variants={itemVariants}>
            <Box 
              component="dl" 
              sx={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 3,
                mb: 4
              }}
            >
              {dataItems.map((item) => (
                <motion.div
                  key={item.label}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Box 
                    sx={{ 
                      p: 2.5,
                      borderRadius: '16px',
                      background: alpha(theme.palette.background.paper, 0.5),
                      backdropFilter: 'blur(8px)',
                      border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        background: alpha(theme.palette.background.paper, 0.7),
                        boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.1)}`
                      }
                    }}
                  >
                    <Typography 
                      component="dt" 
                      variant="caption" 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1, 
                        mb: 0.5,
                        color: alpha(theme.palette.text.secondary, 0.9)
                      }}
                    >
                      {item.icon} {item.label}
                    </Typography>
                    <Typography 
                      component="dd" 
                      fontWeight="medium"
                      sx={{
                        color: theme.palette.text.primary
                      }}
                    >
                      {item.value}
                    </Typography>
                  </Box>
                </motion.div>
              ))}
            </Box>
          </motion.div>

          {/* Action button */}
          <motion.div 
            variants={itemVariants}
            style={{ display: 'flex', justifyContent: 'flex-end' }}
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                variant="contained"
                startIcon={<LockResetOutlined />}
                onClick={() => navigate('/change-password', { state: { voluntary: true } })}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: '14px',
                  fontWeight: 700,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  backdropFilter: 'blur(4px)',
                  boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.25)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.35)}`
                  }
                }}
              >
                Cambiar contraseña
              </Button>
            </motion.div>
          </motion.div>
        </Paper>
      </motion.div>
    </AnimatePresence>
  );
};

export default Profile;