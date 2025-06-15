import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

// Slices
import authReducer from './authSlice';
import notificationReducer from './notificationSlice';
import propietariosReducer from './propietariosSlice';
import huertaReducer from './huertaSlice';
import huertaRentadaReducer from './huertaRentadaSlice';
import cosechasReducer from './cosechasSlice';
import inversionesReducer from './inversionesSlice';
import ventasReducer from './ventasSlice';
import categoriaInversionReducer from './categoriaInversionSlice';
import temporadaReducer from './temporadaSlice';
import breadcrumbsReducer from './breadcrumbsSlice';
import userReducer from './userSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    notification: notificationReducer,
    propietarios: propietariosReducer,
    breadcrumbs: breadcrumbsReducer,
    huerta: huertaReducer,
    huertaRentada: huertaRentadaReducer,
    temporada: temporadaReducer,
    cosechas: cosechasReducer,
    inversiones: inversionesReducer,
    ventas: ventasReducer,
    categoriasInversion: categoriaInversionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
