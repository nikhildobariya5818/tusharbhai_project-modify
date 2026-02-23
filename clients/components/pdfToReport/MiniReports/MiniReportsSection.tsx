"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "../../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"
import { Upload, X } from "lucide-react"
import { pdf } from "@react-pdf/renderer"
import InvoicePDFMini from "./InvoicePDFMini"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog"
import { Label } from "../../ui/label"
import { Input } from "../../ui/input"
import { apiClient } from "../../../lib/apiClient"
import { generateMiniReportFileName } from "./utils/miniReportFileName"

interface ReportData {
  ReportNumber: string
  ReportDate: string
  GIANATURALDIAMONDGRADINGREPORT: {
    GIAReportNumber: string
    ShapeandCuttingStyle: string
    Measurements: string
  }
  GRADINGRESULTS: {
    CaratWeight: string
    ColorGrade: string
    ClarityGrade: string
    CutGrade: string
  }
  ADDITIONALGRADINGINFORMATION: {
    Polish: string
    Symmetry: string
    Fluorescence: string
    Inscription: string
    ClarityCharacteristics: string
  }
  Images: {
    Proportions: string
    QRCode: string
    Barcode10: { number: string; image: string }
    Barcode12: { number: string; image: string }
  }
  address: string
  city: string
  state: string
  country: string
}

interface LocationData {
  address: string
  city: string
  state: string
  country: string
}

interface OffsetData {
  top: number
  bottom: number
  left: number
  right: number
}

export default function MiniReportsSection() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showPositionDialog, setShowPositionDialog] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<"top" | "bottom">("top")
  const [fetchedReports, setFetchedReports] = useState<ReportData[]>([])
  const [loadingStatus, setLoadingStatus] = useState<string>("idle")
  const [loadingProgress, setLoadingProgress] = useState<number>(0)
  const [locationData, setLocationData] = useState<LocationData>({
    address: "Plot No C-70 Bkc, Bandra (E)",
    city: "Mumbai",
    state: "MH 400051",
    country: "india",
  })
  const [offsetData, setOffsetData] = useState<OffsetData>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const pdfFiles = files.filter((f) => f.type === "application/pdf")

    if (pdfFiles.length === 0) {
      toast.error("Please select PDF files")
      return
    }

    if (pdfFiles.length > 2) {
      toast.error("Maximum 2 PDF files allowed")
      return
    }

    setUploadedFiles(pdfFiles)
    if (pdfFiles.length === 1) {
      setShowPositionDialog(true)
    } else if (pdfFiles.length === 2) {
      handleProcessPdfs(pdfFiles, "dual")
    }
  }

  const handleLocationChange = (field: keyof LocationData, value: string) => {
    setLocationData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleOffsetChange = (field: keyof OffsetData, value: number) => {
    setOffsetData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleProcessPdfs = async (files: File[], mode: "single" | "dual" = "single") => {
    setIsLoading(true)
    setLoadingStatus("uploading")
    setLoadingProgress(20)
    try {
      const data = await apiClient.uploadMiniReports(files, {
        locationData,
      })
      console.log("[v0] Fetched reports:", data)
      console.log("[v0] Location data sent:", locationData)
      setLoadingStatus("processing")
      setLoadingProgress(50)

      if (data.reports && Array.isArray(data.reports)) {
        const reports = data.reports.slice(0, 2)

        if (mode === "single" && files.length === 1) {
          const singleReport = reports[0]
          const reportsArray = selectedPosition === "top" ? [singleReport, null] : [null, singleReport]
          setFetchedReports([singleReport])
          await generatePDF(reportsArray)
        } else if (mode === "dual" && files.length === 2) {
          setFetchedReports(reports)
          await generatePDF(reports)
        }

        setShowPositionDialog(false)
      } else {
        toast.error("Invalid response format from API")
      }
    } catch (error) {
      console.error("[v0] Error processing PDFs:", error)
      toast.error("Failed to process PDF files. Ensure FastAPI is running.")
    } finally {
      setIsLoading(false)
      setLoadingStatus("idle")
      setLoadingProgress(0)
      setUploadedFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const generatePDF = async (reports: (ReportData | null)[]) => {
    setIsGenerating(true)
    setLoadingStatus("generating")
    setLoadingProgress(70)
    try {
      const reportsWithLocation = reports.map((report) => (report ? { ...report, ...locationData } : null))

      const blob = await pdf(<InvoicePDFMini reports={reportsWithLocation} offsetData={offsetData} />).toBlob()
      setLoadingProgress(90)

      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = generateMiniReportFileName(reports)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setLoadingStatus("complete")
      setLoadingProgress(100)
      toast.success("Mini reports PDF downloaded successfully!")
    } catch (error) {
      console.error("[v0] Error generating PDF:", error)
      toast.error("Failed to generate PDF")
    } finally {
      setIsGenerating(false)
      setTimeout(() => {
        setLoadingStatus("idle")
        setLoadingProgress(0)
      }, 1500)
    }
  }

  const handlePositionSubmit = () => {
    if (uploadedFiles.length === 1) {
      handleProcessPdfs(uploadedFiles, "single")
    }
  }

  const isLocationComplete = locationData.address && locationData.city && locationData.state && locationData.country

  return (
    <div className="space-y-4">
      {(isLoading || isGenerating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                {loadingStatus === "uploading" && "Uploading PDF"}
                {loadingStatus === "processing" && "Processing Data"}
                {loadingStatus === "generating" && "Generating Report"}
                {loadingStatus === "complete" && "Complete"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {loadingStatus === "uploading" && "Please wait while we upload your PDF..."}
                {loadingStatus === "processing" && "Extracting and analyzing data..."}
                {loadingStatus === "generating" && "Creating PDF report..."}
                {loadingStatus === "complete" && "Your PDF is being downloaded..."}
              </p>
              <div className="w-48 h-2 bg-border rounded-full overflow-hidden mx-auto">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground">{loadingProgress}%</p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Mini Reports PDF Generator</CardTitle>
          <CardDescription>
            Upload 1-2 PDF documents. Single PDF: select position (top/bottom). Dual PDFs: auto download.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 p-4 bg-accent/30 rounded-lg border border-border">
            <h3 className="font-semibold text-sm">Location Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm">
                  Address
                </Label>
                <Input
                  id="address"
                  placeholder="Enter address"
                  value={locationData.address}
                  onChange={(e) => handleLocationChange("address", e.target.value)}
                  disabled={isLoading || isGenerating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm">
                  City
                </Label>
                <Input
                  id="city"
                  placeholder="Enter city"
                  value={locationData.city}
                  onChange={(e) => handleLocationChange("city", e.target.value)}
                  disabled={isLoading || isGenerating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm">
                  State
                </Label>
                <Input
                  id="state"
                  placeholder="Enter state"
                  value={locationData.state}
                  onChange={(e) => handleLocationChange("state", e.target.value)}
                  disabled={isLoading || isGenerating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country" className="text-sm">
                  Country
                </Label>
                <Input
                  id="country"
                  placeholder="Enter country"
                  value={locationData.country}
                  onChange={(e) => handleLocationChange("country", e.target.value)}
                  disabled={isLoading || isGenerating}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 bg-accent/30 rounded-lg border border-border">
            <h3 className="font-semibold text-sm">Report Position Offset (in pixels)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="offset-top" className="text-sm flex items-center gap-2">
                  ⬆️ Up
                </Label>
                <Input
                  id="offset-top"
                  type="number"
                  placeholder="0"
                  value={offsetData.top}
                  onChange={(e) => handleOffsetChange("top", parseFloat(e.target.value) || 0)}
                  disabled={isLoading || isGenerating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offset-bottom" className="text-sm flex items-center gap-2">
                  ⬇️ Down
                </Label>
                <Input
                  id="offset-bottom"
                  type="number"
                  placeholder="0"
                  value={offsetData.bottom}
                  onChange={(e) => handleOffsetChange("bottom", parseFloat(e.target.value) || 0)}
                  disabled={isLoading || isGenerating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offset-left" className="text-sm flex items-center gap-2">
                  ⬅️ Left
                </Label>
                <Input
                  id="offset-left"
                  type="number"
                  placeholder="0"
                  value={offsetData.left}
                  onChange={(e) => handleOffsetChange("left", parseFloat(e.target.value) || 0)}
                  disabled={isLoading || isGenerating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offset-right" className="text-sm flex items-center gap-2">
                  ➡️ Right
                </Label>
                <Input
                  id="offset-right"
                  type="number"
                  placeholder="0"
                  value={offsetData.right}
                  onChange={(e) => handleOffsetChange("right", parseFloat(e.target.value) || 0)}
                  disabled={isLoading || isGenerating}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Enter values to move the report. Positive values move right/down, negative values move left/up.</p>
          </div>

          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-accent/50 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="pdf-upload"
              disabled={isLoading || isGenerating || !isLocationComplete}
            />
            <Label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">Click to upload PDF (1-2 files)</span>
              <span className="text-xs text-muted-foreground">PDF files only</span>
            </Label>
          </div>

          {!isLocationComplete && (
            <p className="text-xs text-destructive">Please fill in all location fields before uploading</p>
          )}

          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Uploaded Files:</Label>
              <div className="space-y-2">
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-accent/50 rounded">
                    <span className="text-sm">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))
                        if (fileInputRef.current) fileInputRef.current.value = ""
                      }}
                      disabled={isLoading || isGenerating}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadedFiles.length === 1 && !showPositionDialog && (
            <Button onClick={() => setShowPositionDialog(true)} className="w-full" disabled={isLoading || isGenerating}>
              {isLoading || isGenerating ? "Processing..." : "Select Position"}
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPositionDialog} onOpenChange={setShowPositionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Position Single Report</DialogTitle>
            <DialogDescription>Choose where to position the report on the page</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={selectedPosition === "top" ? "default" : "outline"}
                onClick={() => setSelectedPosition("top")}
                className="h-24"
                disabled={isLoading || isGenerating}
              >
                Top
              </Button>
              <Button
                variant={selectedPosition === "bottom" ? "default" : "outline"}
                onClick={() => setSelectedPosition("bottom")}
                className="h-24"
                disabled={isLoading || isGenerating}
              >
                Bottom
              </Button>
            </div>
            <Button onClick={handlePositionSubmit} disabled={isLoading || isGenerating} className="w-full">
              {isLoading || isGenerating ? "Processing..." : "Generate PDF"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
