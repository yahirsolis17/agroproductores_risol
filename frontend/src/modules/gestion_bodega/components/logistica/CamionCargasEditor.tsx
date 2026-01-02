
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
    TextField,
    Autocomplete,
    CircularProgress,
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

    // Estado para el formulario de agregar - USANDO STOCK AGRUPADO
    const [availableStock, setAvailableStock] = useState<StockAgrupado[]>([]);
    const [loadingStock, setLoadingStock] = useState(false);
    const [selectedStock, setSelectedStock] = useState<StockAgrupado | null>(null);
    const [cantidadToAdd, setCantidadToAdd] = useState<number | ''>('');
    const [submitting, setSubmitting] = useState(false);
    const [errorInfo, setErrorInfo] = useState<string | null>(null);

    useEffect(() => {
        setCargas(initialCargas);
    }, [initialCargas]);

    const fetchStock = async () => {
        setLoadingStock(true);
        try {
            // NUEVO: Usar stock agrupado por combinación
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
        setSelectedStock(null);
        setCantidadToAdd('');
        setErrorInfo(null);
    };

    const handleCloseAdd = () => {
        setOpenAdd(false);
    };

    const handleAddCarga = async () => {
        if (!selectedStock || !cantidadToAdd || Number(cantidadToAdd) <= 0) return;

        setSubmitting(true);
        setErrorInfo(null);
        try {
            // NUEVO: Enviar combinación en lugar de clasificacion_id
            await camionesService.addCarga(camionId, {
                calidad: selectedStock.calidad,
                material: selectedStock.material,
                tipo_mango: selectedStock.tipo_mango,
                cantidad: Number(cantidadToAdd)
            });
            // Success
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
                            cargas.map((carga) => (
                                <TableRow key={carga.id}>
                                    <TableCell>{carga.clasificacion_desc?.split('-')?.[0] || '?'}</TableCell>
                                    <TableCell>{carga.clasificacion_desc?.split('-')?.[1] || '?'}</TableCell>
                                    <TableCell>
                                        <Typography variant="caption" display="block">
                                            {carga.clasificacion_desc || `ID: ${carga.clasificacion_empaque}`}
                                        </Typography>
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

            {/* Dialog Add Carga */}
            <Dialog open={openAdd} onClose={handleCloseAdd} maxWidth="sm" fullWidth>
                <DialogTitle>Agregar Carga al Camión</DialogTitle>
                <DialogContent dividers>
                    <Box display="flex" flexDirection="column" gap={2} pt={1}>
                        <Autocomplete
                            options={availableStock}
                            loading={loadingStock}
                            getOptionLabel={(option) => {
                                return `${option.material} - ${option.calidad} - ${option.tipo_mango} | Disp: ${option.disponible}`;
                            }}
                            renderOption={(props, option) => (
                                <li {...props}>
                                    <Box display="flex" flexDirection="column" width="100%">
                                        <Box display="flex" justifyContent="space-between" width="100%">
                                            <Typography variant="body2" fontWeight="bold">
                                                {option.material} - {option.calidad} - {option.tipo_mango}
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
                                            Fecha FEFO: {option.fecha_min}
                                        </Typography>
                                    </Box>
                                </li>
                            )}
                            value={selectedStock}
                            onChange={(_, val) => setSelectedStock(val)}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Seleccionar Stock Disponible"
                                    placeholder="Buscar por calidad, material o tipo..."
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

                        {selectedStock && (
                            <Box mt={1} p={1} bgcolor="background.paper" borderRadius={1} border={1} borderColor="divider">
                                <Typography variant="subtitle2" color="primary">
                                    Seleccionado: {selectedStock.material} - {selectedStock.calidad} - {selectedStock.tipo_mango}
                                </Typography>
                                <Typography variant="body2">
                                    Fecha FEFO: <strong>{selectedStock.fecha_min}</strong>
                                </Typography>
                                <Typography variant="body2" color="success.main" mt={0.5}>
                                    Disponible Total: <strong>{selectedStock.disponible}</strong> cajas
                                </Typography>
                                <Typography variant="caption" color="textSecondary" display="block" mt={0.5}>
                                    El sistema asignará automáticamente por FEFO (más antiguo primero)
                                </Typography>
                            </Box>
                        )}

                        <TextField
                            label="Cantidad a Cargar"
                            type="number"
                            value={cantidadToAdd}
                            onChange={(e) => setCantidadToAdd(Number(e.target.value))}
                            error={Boolean(errorInfo) || (selectedStock ? Number(cantidadToAdd) > selectedStock.disponible : false)}
                            helperText={errorInfo || (selectedStock && Number(cantidadToAdd) > selectedStock.disponible ? "Excede disponible" : "")}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAdd} color="inherit">Cancelar</Button>
                    <Button
                        onClick={handleAddCarga}
                        variant="contained"
                        disabled={!selectedStock || !cantidadToAdd || submitting || (selectedStock && Number(cantidadToAdd) > selectedStock.disponible)}
                    >
                        {submitting ? "Guardando..." : "Agregar Carga"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CamionCargasEditor;
