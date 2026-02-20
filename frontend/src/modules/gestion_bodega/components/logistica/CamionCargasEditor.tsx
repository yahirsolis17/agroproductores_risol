
import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Autocomplete,
    Chip,
    TextField,
    CircularProgress,
    Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
// Services
import { empaquesService } from '../../services/empaquesService';
import camionesService from '../../services/camionesService';

// Types para stock agrupado
interface StockAgrupado {
    calidad: string;
    material: string;
    tipo_mango: string;
    disponible: number;
    fecha_min: string;
    huerteros: string;
}

interface CamionCargasEditorProps {
    camionId: number;
    bodegaId: number;
    temporadaId: number;
    semanaId?: number | null;
    initialCargas?: any[]; // Array de CamionConsumoEmpaque
    onCargasChange?: () => void; // Callback para refrescar camión padre
    readOnly?: boolean;
}

const CamionCargasEditor: React.FC<CamionCargasEditorProps> = ({
    camionId,
    bodegaId,
    temporadaId,
    semanaId,
    initialCargas = [],
    onCargasChange,
    readOnly = false,
}) => {
    const [cargas, setCargas] = useState<any[]>(initialCargas);
    const [openAdd, setOpenAdd] = useState(false);

    // Estado para el formulario de agregar - MULTI-SELECT
    const [availableStock, setAvailableStock] = useState<StockAgrupado[]>([]);
    const [loadingStock, setLoadingStock] = useState(false);
    const [selectedStocks, setSelectedStocks] = useState<StockAgrupado[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [errorInfo, setErrorInfo] = useState<string | null>(null);

    useEffect(() => {
        setCargas(initialCargas);
    }, [initialCargas]);

    const fetchStock = async () => {
        setLoadingStock(true);
        try {
            const rows = await empaquesService.listDisponiblesAgrupados({
                bodega: bodegaId,
                temporada: temporadaId,
                semana: semanaId
            });
            setAvailableStock(rows);
        } catch (err) {
            console.error("Error fetching stock", err);
        } finally {
            setLoadingStock(false);
        }
    };

    const handleOpenAdd = () => {
        setOpenAdd(true);
        fetchStock();
        setSelectedStocks([]);
        setErrorInfo(null);
    };

    const handleCloseAdd = () => {
        setOpenAdd(false);
    };

    const handleAddCarga = async () => {
        if (selectedStocks.length === 0) return;

        setSubmitting(true);
        setErrorInfo(null);
        try {
            // Send one addCarga per selected stock sequentially
            for (const stock of selectedStocks) {
                await camionesService.addCarga(camionId, {
                    calidad: stock.calidad,
                    material: stock.material,
                    tipo_mango: stock.tipo_mango,
                    cantidad: stock.disponible
                });
            }
            if (onCargasChange) onCargasChange();
            handleCloseAdd();
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.errors?.detail || err.response?.data?.message || "Error al agregar carga";
            setErrorInfo(Array.isArray(msg) ? msg[0] : msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemoveCarga = async (cargaId: number) => {
        if (!window.confirm("¿Eliminar esta carga? El stock regresará a disponible.")) return;

        try {
            await camionesService.removeCarga(camionId, { carga_id: cargaId });
            if (onCargasChange) onCargasChange();
        } catch (err) {
            console.error(err);
            alert("Error eliminando carga");
        }
    };

    const totalCajas = cargas.reduce((acc, c) => acc + (c.cantidad || 0), 0);
    const totalSelected = selectedStocks.reduce((acc, s) => acc + s.disponible, 0);

    return (
        <Box sx={{ mt: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6">Carga (Inventario Real)</Typography>
                {!readOnly && (
                    <Button
                        startIcon={<AddCircleIcon />}
                        variant="contained"
                        size="small"
                        onClick={handleOpenAdd}
                    >
                        Agregar Carga
                    </Button>
                )}
            </Box>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Material</TableCell>
                            <TableCell>Calidad</TableCell>
                            <TableCell>Datos Origen</TableCell>
                            <TableCell align="right">Cantidad</TableCell>
                            {!readOnly && <TableCell align="center">Acciones</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {cargas.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    <Typography variant="body2" color="textSecondary">
                                        No hay cargas registradas (0 cajas).
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            cargas.map((carga, idx) => (
                                <TableRow key={carga.id}>
                                    <TableCell>{carga.material || carga.clasificacion_desc?.split('-')?.[0] || '?'}</TableCell>
                                    <TableCell>{carga.calidad || carga.clasificacion_desc?.split('-')?.[1] || '?'}</TableCell>
                                    <TableCell>
                                        <Typography variant="caption" display="block" fontWeight={600}>
                                            Empaque #{carga.recepcion_folio || idx + 1} — {carga.tipo_mango || '?'}
                                        </Typography>
                                        {carga.huertero_nombre && (
                                            <Typography variant="caption" display="block" color="text.secondary">
                                                Huertero: {carga.huertero_nombre}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        <strong>{carga.cantidad}</strong>
                                    </TableCell>
                                    {!readOnly && (
                                        <TableCell align="center">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleRemoveCarga(carga.id)}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                        {cargas.length > 0 && (
                            <TableRow>
                                <TableCell colSpan={3} align="right"><strong>Total:</strong></TableCell>
                                <TableCell align="right"><strong>{totalCajas}</strong></TableCell>
                                {!readOnly && <TableCell />}
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Dialog Add Carga — MULTI-SELECT */}
            <Dialog open={openAdd} onClose={handleCloseAdd} maxWidth="sm" fullWidth>
                <DialogTitle>Agregar Carga al Camión</DialogTitle>
                <DialogContent dividers>
                    <Box display="flex" flexDirection="column" gap={2} pt={1}>
                        <Autocomplete
                            multiple
                            options={availableStock}
                            loading={loadingStock}
                            disableCloseOnSelect
                            getOptionLabel={(option) =>
                                `${option.material} - ${option.calidad} - ${option.tipo_mango} (${option.disponible} cajas) — ${option.huerteros}`
                            }
                            isOptionEqualToValue={(a, b) =>
                                a.calidad === b.calidad && a.material === b.material && a.tipo_mango === b.tipo_mango
                            }
                            renderOption={(props, option) => (
                                <li {...props}>
                                    <Box display="flex" flexDirection="column" width="100%" gap={0.3}>
                                        <Box display="flex" justifyContent="space-between" width="100%">
                                            <Typography variant="body2" fontWeight="bold">
                                                {option.material === "MADERA" ? "📦" : "🔲"} {option.calidad} — {option.tipo_mango}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color={option.disponible < 50 ? 'error' : 'success.main'}
                                                fontWeight="bold"
                                            >
                                                {option.disponible} cajas
                                            </Typography>
                                        </Box>
                                        <Typography variant="caption" color="textSecondary">
                                            Huertero: {option.huerteros} · FEFO: {option.fecha_min}
                                        </Typography>
                                    </Box>
                                </li>
                            )}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip
                                        {...getTagProps({ index })}
                                        key={`${option.calidad}-${option.material}-${option.tipo_mango}`}
                                        label={`${option.material === "MADERA" ? "📦" : "🔲"} ${option.calidad} · ${option.disponible}`}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                    />
                                ))
                            }
                            value={selectedStocks}
                            onChange={(_, val) => setSelectedStocks(val)}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Seleccionar Stock Disponible"
                                    placeholder={selectedStocks.length > 0 ? "" : "Buscar por calidad, material, huertero..."}
                                    InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                            <React.Fragment>
                                                {loadingStock ? <CircularProgress color="inherit" size={20} /> : null}
                                                {params.InputProps.endAdornment}
                                            </React.Fragment>
                                        ),
                                    }}
                                />
                            )}
                        />

                        {selectedStocks.length > 0 && (
                            <Box p={1.5} bgcolor="background.paper" borderRadius={1} border={1} borderColor="divider">
                                <Typography variant="subtitle2" color="primary" mb={0.5}>
                                    {selectedStocks.length} item{selectedStocks.length > 1 ? "s" : ""} seleccionado{selectedStocks.length > 1 ? "s" : ""}
                                </Typography>
                                {selectedStocks.map((s) => (
                                    <Typography key={`${s.calidad}-${s.material}-${s.tipo_mango}`} variant="body2" sx={{ lineHeight: 1.6 }}>
                                        {s.material === "MADERA" ? "📦" : "🔲"} {s.calidad} — {s.tipo_mango}: <strong>{s.disponible} cajas</strong>
                                    </Typography>
                                ))}
                                <Typography variant="subtitle2" mt={1} color="success.main">
                                    Total a cargar: <strong>{totalSelected} cajas</strong>
                                </Typography>
                                <Typography variant="caption" color="textSecondary" display="block" mt={0.5}>
                                    El sistema asignará automáticamente por FEFO (más antiguo primero)
                                </Typography>
                            </Box>
                        )}

                        {errorInfo && (
                            <Alert severity="error" onClose={() => setErrorInfo(null)}>
                                {errorInfo}
                            </Alert>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAdd} color="inherit">Cancelar</Button>
                    <Button
                        onClick={handleAddCarga}
                        variant="contained"
                        disabled={selectedStocks.length === 0 || submitting}
                    >
                        {submitting ? "Guardando..." : `Agregar ${selectedStocks.length > 1 ? `${selectedStocks.length} Cargas` : "Carga"}`}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CamionCargasEditor;

