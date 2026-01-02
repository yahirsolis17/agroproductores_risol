import { Box, Typography } from '@mui/material';

export const normalizeErrorMessages = (error: unknown): string[] => {
  if (!error) return [];
  if (Array.isArray(error)) {
    return error.map((item) => (typeof item === 'string' ? item : String(item))).filter(Boolean);
  }
  if (typeof error === 'string') return [error];
  return [String(error)];
};

export const renderErrorMessages = (messages: string[]) => {
  if (!messages.length) return ' ';
  if (messages.length === 1) return messages[0];
  return (
    <Box component="ul" sx={{ pl: 2, my: 0.5 }}>
      {messages.map((message) => (
        <Typography component="li" variant="caption" key={message}>
          {message}
        </Typography>
      ))}
    </Box>
  );
};
