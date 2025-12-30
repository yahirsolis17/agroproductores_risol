import React from 'react';
import { Alert, AlertTitle, Collapse } from '@mui/material';

type Props = {
  open: boolean;
  severity?: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  messages: string[];
};

const FormAlertBanner: React.FC<Props> = ({ open, severity = 'error', title, messages }) => (
  <Collapse in={open} unmountOnExit>
    <Alert severity={severity} sx={{ mb: 2 }}>
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      {messages.length === 1 ? messages[0] : (
        <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </Alert>
  </Collapse>
);

export default FormAlertBanner;
