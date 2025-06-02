// src/global/store/breadcrumbsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Crumb { label: string; path: string }

interface BreadcrumbsState { crumbs: Crumb[] }

const initialState: BreadcrumbsState = { crumbs: [] };

const breadcrumbsSlice = createSlice({
  name: 'breadcrumbs',
  initialState,
  reducers: {
    setBreadcrumbs:  (st, a: PayloadAction<Crumb[]>) => { st.crumbs = a.payload },
    clearBreadcrumbs:(st)                         => { st.crumbs = [] },
  },
});

export const { setBreadcrumbs, clearBreadcrumbs } = breadcrumbsSlice.actions;
export default breadcrumbsSlice.reducer;
