// components/admin/ProductTable.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type {
    GridReadyEvent,
    GridApi,
    ColDef,
    ICellRendererParams,
} from "ag-grid-community";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";

import { Input } from "../ui/input";
import { useReports } from "../../hooks/useReports";
import EditModal from "./EditModal";
import DeleteModal from "./DeleteModal";
import { Button } from "../ui/button";
import { DEFAULT_PAGE_SIZE, MAX_SEARCH_WORDS } from "../../lib/env";
import { toast } from "sonner";
import { apiClient } from "../../lib/apiClient";
import JSZip from "jszip";

ModuleRegistry.registerModules([AllCommunityModule]);

export type Product = {
    report_no: string;
    shape_and_cut?: string;
    tot_est_weight?: number | string;
    color?: string;
    clarity?: string;
    style_number?: string;
    // optional fields your EditModal might read (description, etc.)
    description?: string;
};

/* ActionCell: typed React cell renderer component */
/* Replace the previous ActionCell with this version */
const ActionCell: React.FC<
    ICellRendererParams<Product, any> & {
        onEdit?: (report_no: string) => void;
        onDeleted?: (report_no: string) => void;
        buttonClassName?: string;
    }
> = (props) => {
    const { data, onEdit, onDeleted, buttonClassName } = props;
    if (!data) return <div />;

    const handleEdit = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        e?.preventDefault();
        onEdit?.(data.report_no ?? "");
    };

    const handlePrint = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        e?.preventDefault();
        const reportNo = data.report_no ?? "";
        if (!reportNo) return;
        const url = `/admin/report-viewer-grid?r=${encodeURIComponent(reportNo)}`;
        try {
            window.open(url, "_blank", "noopener,noreferrer");
        } catch {
            // silent
        }
    };

    return (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
                type="button"
                onClick={handleEdit}
                title="Edit"
                className="transition-smooth hover:scale-[1.02]"
                variant={"default"}
            >
                Edit
            </Button>

            <Button
                type="button"
                onClick={handlePrint}
                title={`Open report ${data.report_no}`}
                className="transition-smooth hover:scale-[1.02]"
                variant={"outline"}
            >
                Print
            </Button>

            <div className="relative" onClick={(e) => e.stopPropagation()}>
                <DeleteModal
                    report_no={data.report_no}
                    onDeleted={() => onDeleted?.(data.report_no)}
                    buttonClassName={buttonClassName ?? "px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 text-sm"}
                    dialogTitle={`Delete report ${data.report_no}?`}
                    dialogDescription="This will permanently delete the report. This action cannot be undone."
                />
            </div>
        </div>
    );
};

export default function ProductTable() {
    const gridApi = useRef<GridApi | null>(null);

    // client-visible controls
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [quickSearch, setQuickSearch] = useState("");
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isShowingAll, setIsShowingAll] = useState(false);
    const [allRecords, setAllRecords] = useState<Product[]>([]);

    // debounce search input so we don't spam the server
    const [debouncedQ, setDebouncedQ] = useState("");
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(quickSearch.trim()), 350);
        return () => clearTimeout(t);
    }, [quickSearch]);

    const q = useMemo(
        () =>
            debouncedQ
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, MAX_SEARCH_WORDS)
                .join(" "),
        [debouncedQ]
    );

    const { data, isLoading, isError, error, refetch, isFetching } = useReports({
        page,
        size: pageSize,
        q: q || undefined,
    });

    const extractItems = (d: any): any[] => d?.items ?? d?.data ?? d?.reports ?? d?.results ?? [];
    const extractTotal = (d: any): number | null => d?.total ?? d?.totalItems ?? d?.count ?? d?.meta?.total ?? null;

    const rows = useMemo<Product[]>(() => {
        if (isShowingAll && allRecords.length > 0) {
            return allRecords;
        }
        const items = extractItems(data);
        return items.map((r: any) => ({
            report_no: r.report_no,
            // shape_and_cut: r.shape_and_cut,
            // tot_est_weight: r.tot_est_weight,
            // color: r.color,
            // clarity: r.clarity,
            style_number: r.style_number,
            // reportedDate: r.reportedDate,
            // description: r.description,
        } as Product));
    }, [data, isShowingAll, allRecords]);

    const totalRows = useMemo(() => {
        const t = extractTotal(data);
        return typeof t === "number" ? t : null;
    }, [data]);

    // editing modal state
    const [editingReportNumber, setEditingReportNumber] = useState<string | null>(null);
    const openEditForReport = useCallback((reportNo: string) => setEditingReportNumber(reportNo), []);
    const closeEdit = useCallback(() => setEditingReportNumber(null), []);
    const afterSaveOrDelete = useCallback(() => {
        refetch();
        setSelectedRows([]);
    }, [refetch]);

    // Handle row selection change
    const handleRowSelectionChanged = useCallback((event: any) => {
        if (gridApi.current) {
            const selectedNodes = gridApi.current.getSelectedRows();
            const selectedRowIds = selectedNodes.map((node: any) => node.report_no);
            setSelectedRows([...selectedRowIds]); // Force new array reference for state update
        }
    }, []);

    // Column definitions — with checkbox selection
    const columnDefs = useMemo<ColDef<Product, any>[]>(
        () => [
            {
                headerName: "",
                width: 50,
                sortable: false,
                filter: false,
                checkboxSelection: true,
                headerCheckboxSelection: true,
                suppressSizeToFit: true,
            },
            { headerName: "Report_NO", field: "report_no", sortable: false, filter: false, resizable: true, minWidth: 180 },
            { headerName: "Style_Number", field: "style_number", sortable: false, filter: false, minWidth: 160 },
            // { headerName: "Shape and Cut", field: "shape_and_cut", sortable: false, filter: false, minWidth: 200 },
            // { headerName: "Tot_Est_Weight", field: "tot_est_weight", sortable: false, filter: "agNumberColumnFilter", minWidth: 140 },
            // { headerName: "Color", field: "color", sortable: false, filter: false, minWidth: 110 },
            // { headerName: "Clarity", field: "clarity", sortable: false, filter: false, minWidth: 110 },
            {
                headerName: "Actions",
                pinned: 'right',
                // DO NOT add `field` here — actions column doesn't correspond to a data field
                minWidth: 250,
                sortable: false,
                filter: false,
                // Provide a cellRenderer function that returns our React component
                cellRenderer: (params: ICellRendererParams<Product, any>) => (
                    <ActionCell
                        {...params}
                        onEdit={(reportNo) => openEditForReport(reportNo)}
                        onDeleted={() => afterSaveOrDelete()}
                    />
                ),
            },
        ],
        [openEditForReport, afterSaveOrDelete]
    );

    const defaultColDef = useMemo(
        () => ({ sortable: true, filter: true, resizable: true, suppressMovable: false, flex: 0 }),
        []
    );

    const onGridReady = useCallback((params: GridReadyEvent) => {
        gridApi.current = params.api;
    }, []);

    // Function to fetch all records
    const fetchAllRecords = useCallback(async () => {
        try {
            const response = await apiClient.getAllReports({
                page: 1,
                size: 0, // Backend treats size=0 as "fetch all records"
                q: q || undefined,
            });

            const items = extractItems(response);
            const mappedItems = items.map((r: any) => ({
                report_no: r.report_no,
                style_number: r.style_number,
            } as Product));

            setAllRecords(mappedItems);
            setIsShowingAll(true);
            setPage(1);
        } catch (err) {
            console.error("[v0] Error fetching all records", err);
            toast.error("Failed to load all records");
        }
    }, [q]);

    useEffect(() => {
        setPage(1);
        setSelectedRows([]);
        setIsShowingAll(false);
    }, [pageSize, q]);

    const totalPages = totalRows ? Math.max(1, Math.ceil(totalRows / pageSize)) : null;
    const canPrev = page > 1;
    const canNext = totalPages ? page < totalPages : rows.length === pageSize;

    // Batch delete selected rows using optimized batch endpoint
    const handleBatchDelete = useCallback(async () => {
        if (selectedRows.length === 0) {
            toast.error("No rows selected");
            return;
        }

        const confirmed = window.confirm(
            `Delete ${selectedRows.length} report(s)? This action cannot be undone.`
        );
        if (!confirmed) return;

        setIsDeleting(true);

        try {
            const response = await apiClient.post("/reports/batch-delete", {
                report_no: selectedRows,
            });

            const { deleted, failed, total } = response;

            if (failed?.length) {
                toast.warning(
                    `Deleted ${deleted} of ${total}. Failed: ${failed
                        .map((f: any) => f.report_no)
                        .join(", ")}`
                );
            } else {
                toast.success(`Successfully deleted ${deleted} report(s)`);
            }

            setSelectedRows([]);
            refetch();
        } catch (err: any) {
            toast.error(
                err?.response?.data?.detail ||
                err?.message ||
                "Failed to delete selected reports"
            );
        } finally {
            setIsDeleting(false);
        }
    }, [selectedRows, refetch]);


    // Download selected rows as PDF(s)
    const handleBatchDownloadPDF = useCallback(async () => {
        if (selectedRows.length === 0) {
            toast.error("No rows selected");
            return;
        }

        setIsExporting(true);
        try {
            // Fetch full report data for selected rows
            const reportDataPromises = selectedRows.map(reportNo =>
                apiClient.getReportById(reportNo)
            );
            const reportDataArray = await Promise.all(reportDataPromises);

            // Map to ReportData format expected by JewelryReportGrid
            const reportData = reportDataArray.map((report: any) => ({
                report_no: report.report_no,
                description: report.description,
                shape_and_cut: report.shape_and_cut,
                tot_est_weight: report.tot_est_weight,
                color: report.color,
                clarity: report.clarity,
                style_number: report.style_number,
                comment: report.comment,
                image_filename: report.image_filename,
                company_logo: report.company_logo,
                isecopy: report.isecopy,
                notice_image: report.notice_image,
                igi_logo: report.igi_logo,
            }));

            // Generate PDFs with 9-item grid (3x3)
            const itemsPerPage = 9; // 3x3 grid
            const pages = chunk(reportData, itemsPerPage);

            if (pages.length === 1) {
                // Single PDF - download directly
                await downloadSinglePDF(pages[0], selectedRows);
            } else {
                // Multiple PDFs - create zip
                await downloadMultiplePDFsAsZip(pages, selectedRows);
            }

            toast.success(`PDF(s) downloaded successfully`);
        } catch (err: any) {
            console.error("PDF export error:", err);
            toast.error(err?.message ?? "Failed to export PDFs");
        } finally {
            setIsExporting(false);
        }
    }, [selectedRows]);

    // Helper function to chunk array
    const chunk = <T,>(arr: T[], size: number): T[][] => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
    };

    // Download single PDF
    const downloadSinglePDF = async (pageData: any[], reportNos: string[]) => {
        const fileName = `Jewelry-Reports-${reportNos.slice(0, 3).join("-")}-${reportNos.length > 3 ? "and-more" : ""}`;

        try {
            // Use the JewelryReportGrid's handleDownloadAll logic adapted for single export
            const pdfBlob = await generatePDFForReports(pageData);

            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${fileName}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Error downloading single PDF:", err);
            throw err;
        }
    };

    // Download multiple PDFs as ZIP
    const downloadMultiplePDFsAsZip = async (pages: any[][], reportNos: string[]) => {
        const baseFileName = `Jewelry-Reports-${reportNos[0]}-multiple`;
        const zip = new JSZip();

        try {
            for (let idx = 0; idx < pages.length; idx++) {
                const pageData = pages[idx];
                const pdfBlob = await generatePDFForReports(pageData);
                const partName = `${baseFileName}-part-${idx + 1}.pdf`;
                zip.file(partName, pdfBlob);
            }

            const zipBlob = await zip.generateAsync({ type: "blob" });
            const zipUrl = URL.createObjectURL(zipBlob);
            const a = document.createElement("a");
            a.href = zipUrl;
            a.download = `${baseFileName}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(zipUrl);
        } catch (err) {
            console.error("Error generating ZIP:", err);
            throw err;
        }
    };

    // Helper to generate PDF blob from report data (mimics JewelryReportGrid PDF generation)
    const generatePDFForReports = useCallback(async (reportData: any[]): Promise<Blob> => {
        // Dynamically import to avoid SSR issues
        const { Document, Page, StyleSheet, View, Font, pdf: pdfRenderer } = await import("@react-pdf/renderer");
        const ReportPDFModule = await import("../excelToReport/ReportPDF");
        const ReportPDF = ReportPDFModule.default;

        // Register fonts (same as JewelryReportGrid)
        const iBMPlexSansBold = "/fonts/IBMPlexSans-Bold.ttf";
        const iTCAvantGardeCondensedNormal = "/fonts/ITC-CE-Book.otf";
        const ITCAvantGardeStdBold = "/fonts/ITCAvantGardeStd-Bold.ttf";
        const CanvaSansRegular = "/fonts/CanvaSans-Regular.otf";
        const ArimoBold = "/fonts/Arimo-Bold.ttf";
        const AVGARDD_2 = "/fonts/AVGARDD_2.ttf";

        try {
            Font.register({
                family: "AVGARDD_2",
                fonts: [{ src: AVGARDD_2, fontWeight: "bold" }],
            });
            Font.register({
                family: "IBMPlexSans",
                fonts: [{ src: iBMPlexSansBold, fontWeight: "semibold" }],
            });
            Font.register({
                family: "ITCAvantGardeCondensed",
                fonts: [
                    { src: iTCAvantGardeCondensedNormal, fontWeight: "normal" },
                    { src: ITCAvantGardeStdBold, fontWeight: "bold" },
                ],
            });
            Font.register({
                family: "CanvaSans",
                fonts: [{ src: CanvaSansRegular, fontWeight: "normal" }],
            });
            Font.register({
                family: "Arimo",
                fonts: [{ src: ArimoBold, fontWeight: "bold" }],
            });
        } catch (e) {
            // Fonts may already be registered
            console.log("Font registration skipped (may already be registered)");
        }

        // Grid configuration (3x3)
        const cols = 3;
        const rows = 3;
        const imgPx = { w: 2480, h: 3508 };
        const dpi = 300;
        const pageWidthPts = (imgPx.w / dpi) * 72;
        const pageHeightPts = (imgPx.h / dpi) * 72;
        const pageDims = { width: pageWidthPts, height: pageHeightPts };

        const itemsPerPage = cols * rows;
        const BORDER_WIDTH = 0.3;
        const BORDER_COLOR = "black";

        const totalBorderX = (cols + 1) * BORDER_WIDTH;
        const totalBorderY = (rows + 1) * BORDER_WIDTH;
        const cellWidth = (pageDims.width - totalBorderX) / cols;
        const cellHeight = (pageDims.height - totalBorderY) / rows;

        const r = (v: number, decimals = 3) => parseFloat(v.toFixed(decimals));
        const verticalXs = Array.from({ length: cols + 1 }, (_, i) =>
            r(i * (cellWidth + BORDER_WIDTH))
        );
        const horizontalYs = Array.from({ length: rows + 1 }, (_, i) =>
            r(i * (cellHeight + BORDER_WIDTH))
        );

        const styles = StyleSheet.create({
            page: { padding: 0, margin: 0, position: "relative" },
            grid: {
                position: "absolute",
                top: 0,
                left: 0,
                width: pageDims.width,
                height: pageDims.height,
                flexDirection: "row",
                flexWrap: "wrap",
            },
            cell: { width: cellWidth, height: cellHeight, overflow: "hidden" },
            rotateWrapper: {
                width: cellWidth,
                height: cellHeight,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
            },
            rotatedContent: { width: cellHeight, height: cellWidth },
            lineCommon: { position: "absolute", backgroundColor: BORDER_COLOR },
        });

        // Create PDF document
        const docEl = (
            <Document title={`Jewelry Report — ${reportData?.[0]?.report_no ?? "batch"}`}>
                <Page size={[pageDims.width, pageDims.height]} style={styles.page}>
                    <View style={styles.grid}>
                        {reportData.map((item: any, idx: number) => (
                            <View key={idx} style={styles.cell}>
                                <View style={styles.rotateWrapper}>
                                    <View style={[styles.rotatedContent, { position: "relative" }]}>
                                        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
                                            <ReportPDF
                                                data={item}
                                                isSingleGridLayout={false}
                                                contentWidth={cellHeight}
                                                contentHeight={cellWidth}
                                                valueWidth={cellWidth + 26.3}
                                            />
                                        </View>
                                        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
                                            <ReportPDF
                                                data={item}
                                                isSingleGridLayout={false}
                                                contentWidth={cellHeight}
                                                contentHeight={cellWidth}
                                                valueWidth={cellWidth + 26.3}
                                                copyType="header-only"
                                                disableQr={true}
                                            />
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ))}
                        {reportData.length < itemsPerPage &&
                            Array.from({ length: itemsPerPage - reportData.length }).map((_, i) => (
                                <View key={`empty-${i}`} style={styles.cell} />
                            ))}
                        {verticalXs.map((x, i) => (
                            <View
                                key={`v-${i}`}
                                style={[
                                    styles.lineCommon,
                                    {
                                        left: x,
                                        top: 0,
                                        width: BORDER_WIDTH,
                                        height: pageDims.height,
                                    },
                                ]}
                            />
                        ))}
                        {horizontalYs.map((y, i) => (
                            <View
                                key={`h-${i}`}
                                style={[
                                    styles.lineCommon,
                                    {
                                        left: 0,
                                        top: y,
                                        width: pageDims.width,
                                        height: BORDER_WIDTH,
                                    },
                                ]}
                            />
                        ))}
                    </View>
                </Page>
            </Document>
        );

        const pdfInstance = pdfRenderer(docEl);
        return await pdfInstance.toBlob();
    }, []);

    return (
        <div className="w-full mx-auto relative" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: 'space-between', gap: 12, marginBottom: 0, flexWrap: "wrap", width: "100%" }}>
                <Input
                    aria-label="Search products"
                    placeholder="Search (up to 25 words)"
                    style={{ width: 400 }}
                    value={quickSearch}
                    onChange={(e) => setQuickSearch(e.target.value)}
                />
                <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <small>{isFetching || isLoading ? "Loading..." : `Showing ${rows.length} rows`}</small>
                    {selectedRows.length > 0 && (
                        <small style={{ fontWeight: "bold", color: "#0066cc" }}>
                            {selectedRows.length} selected
                        </small>
                    )}
                    <select value={isShowingAll ? "all" : pageSize} onChange={(e) => {
                        const val = e.target.value;
                        if (val === "all") {
                            fetchAllRecords();
                        } else {
                            setIsShowingAll(false);
                            setPageSize(Number(val));
                        }
                    }}>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value="all">All</option>
                    </select>
                    {!isShowingAll && (
                        <>
                            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canPrev}>
                                Prev
                            </button>
                            <span>Page {page}{totalPages ? ` of ${totalPages}` : ""}</span>
                            <button onClick={() => setPage((p) => p + 1)} disabled={!canNext}>
                                Next
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Batch action buttons */}
            {selectedRows && selectedRows.length > 0 && (
                <div style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 16,
                    padding: 12,
                    backgroundColor: "#e8f4f8",
                    borderRadius: 8,
                    border: "1px solid #0066cc",
                    width: "100%",
                    flexWrap: "wrap"
                }}>
                    <Button
                        onClick={handleBatchDownloadPDF}
                        disabled={isExporting || isDeleting}
                        variant="default"
                        style={{ minWidth: "160px" }}
                    >
                        {isExporting ? "Exporting PDF..." : `Download as PDF (${selectedRows.length})`}
                    </Button>
                    <Button
                        onClick={handleBatchDelete}
                        disabled={isDeleting || isExporting}
                        variant="destructive"
                        style={{ minWidth: "140px" }}
                    >
                        {isDeleting ? "Deleting..." : `Delete (${selectedRows.length})`}
                    </Button>
                    <Button
                        onClick={() => setSelectedRows([])}
                        disabled={isDeleting || isExporting}
                        variant="outline"
                        style={{ minWidth: "120px" }}
                    >
                        Clear Selection
                    </Button>
                </div>
            )}

            <div className="ag-theme-alpine" style={{ width: "100%", height: 450 }}>
                <AgGridReact
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    rowData={rows}
                    animateRows={false}
                    rowSelection="multiple"
                    onGridReady={onGridReady}
                    onSelectionChanged={handleRowSelectionChanged}
                    suppressRowClickSelection={true}
                    pagination={false}
                    rowModelType={"clientSide"}
                    getRowId={(params) => params.data.report_no}
                    suppressAggFuncInHeader={true}
                    enableCellTextSelection={true}
                />
            </div>

            {isError && (
                <div style={{ color: "red", marginTop: 8 }}>
                    Error loading reports: {(error as any)?.message ?? String(error)}
                </div>
            )}
            <EditModal
                reportNumber={editingReportNumber ?? ""}
                onClose={closeEdit}
                onSave={() => {
                    closeEdit();
                    afterSaveOrDelete();
                    toast.success("Report updated");
                }}
            />
        </div>
    );
}
