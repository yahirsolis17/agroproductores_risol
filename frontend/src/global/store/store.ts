import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

// Slices
import authReducer from './authSlice';
import notificationReducer from './notificationSlice';
// Importa otros si deseas: huertaSlice, inversionesSlice, etc.

export const store = configureStore({
  reducer: {
    auth: authReducer,
    notification: notificationReducer,
    // huerta: huertaReducer, etc...
  },
});

// Tipos
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Custom Hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
