"use client"
import type React from "react"
import { useRef, useState } from "react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Upload, FileText, Check } from "lucide-react"
import { toast } from "sonner"
import { pdf } from "@react-pdf/renderer"
import InvoicePDF from "./StandardReports/InvoicePDF"
import { useUploadPdf } from "../../hooks/useReports"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import MiniReportsSection from "./MiniReports/MiniReportsSection"

interface ProportionData {
  TBL: string
  TD: string
  CA: string
  PA: string
  ST: string
  LH: string
  reportType: string
  address: string
  cityState: string
  country: string
  girdle: string
  culet: string
  depth: string
  table: string
  pdfname: string
  size: "small" | "large"
}

interface OffsetData {
  top: number
  bottom: number
  left: number
  right: number
}

const ReportProcessor = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadPdfMutation = useUploadPdf()
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [pdfSize, setPdfSize] = useState<"17x11" | "14x8.5">("17x11")
  const [activeTab, setActiveTab] = useState<"standard" | "mini">("standard")
  const [offsetData, setOffsetData] = useState<OffsetData>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  })

  const [proportions, setProportions] = useState<ProportionData>({
    TBL: "",
    TD: "",
    CA: "",
    PA: "",
    ST: "",
    LH: "",
    depth: "",
    table: "",
    reportType: "Diamond Grading Report",
    address: "Plot No C-70 Bkc, Bandra (E)",
    cityState: "Mumbai, MH 400051",
    country: "India",
    girdle: "",
    culet: "NON",
    pdfname: "",
    size: "small",
  })

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Invalid file type", {})
        return
      }
      setUploadedFile(file)
      toast.success("File uploaded successfully", {})
    }
  }

  const handleProportionChange = (field: keyof ProportionData, value: string) => {
    setProportions((prev) => ({
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

  const validateForm = () => {
    if (!uploadedFile) {
      toast.warning("Please upload a PDF file", {})
      return false
    }
    return true
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validateForm()) return
    setIsLoading(true)
    setUploadProgress(null)

    try {
      const result = await uploadPdfMutation.mutateAsync({
        file: uploadedFile!,
        proportions,
        onUploadProgress: (progressEvent?: any) => {
          if (!progressEvent || !progressEvent.total) return
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100)
          setUploadProgress(percent)
        },
      })

      const mergedData = {
        ...result,
        ...proportions,
      }

      const currentDate = new Date()
      const day = String(currentDate.getDate()).padStart(2, "0")
      const month = String(currentDate.getMonth() + 1).padStart(2, "0")
      const year = currentDate.getFullYear()
      const formattedDate = `${day}-${month}-${year}`

      let fileName = `${mergedData.GIANATURALDIAMONDGRADINGREPORT?.GIAReportNumber}/${formattedDate}.pdf`
      if (proportions.pdfname && proportions.pdfname.trim() !== "") {
        fileName = `${mergedData.GIANATURALDIAMONDGRADINGREPORT?.GIAReportNumber}/${formattedDate}-${proportions.pdfname.trim()}.pdf`
      }

      const blob = await pdf(<InvoicePDF data={mergedData} size={pdfSize} offsetData={offsetData} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)

      toast.success("Report processed successfully!")
      if (fileInputRef.current) fileInputRef.current.value = ""
      setUploadedFile(null)
      setPdfSize("17x11")
      setProportions({
        TBL: "",
        TD: "",
        CA: "",
        PA: "",
        ST: "",
        LH: "",
        depth: "",
        table: "",
        reportType: "Diamond Grading Report",
        address: "Plot No C-70 Bkc, Bandra (E)",
        cityState: "Mumbai, MH 400051",
        country: "India",
        girdle: "",
        culet: "NON",
        pdfname: "",
        size: "large",
      })
    } catch (error: any) {
      console.error("Upload error:", error)
      toast.error(
        `Processing failed. ${error.code === "ERR_NETWORK" ? "Back-end not connected" : "Unable to process your document. Please try again"}`,
      )
    } finally {
      setIsLoading(false)
      setUploadProgress(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-6 relative">
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Processing Report</h3>
              <p className="text-sm text-muted-foreground">Please wait while we process your document...</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Report Processor</h1>
          <p className="text-muted-foreground">Upload your PDF and configure proportion data</p>
        </div>

        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab("standard")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "standard"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Standard Reports
          </button>
          <button
            onClick={() => setActiveTab("mini")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "mini"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Mini Reports
          </button>
        </div>

        {activeTab === "standard" && (
          <>
            <Card className="shadow-elegant border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Report Configuration
                </CardTitle>
                <CardDescription>Configure your report type and upload the required PDF document</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="pdf-size" className="text-sm font-medium">
                    PDF Size
                  </Label>
                  <Select value={pdfSize} onValueChange={(value: "17x11" | "14x8.5") => setPdfSize(value)}>
                    <SelectTrigger id="pdf-size" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="17x11">17 × 11 inches (1224 × 792 points)</SelectItem>
                      <SelectItem value="14x8.5">14 × 8.5 inches (1008 × 612 points)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Select the output size for your PDF report</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pdf-upload" className="text-sm font-medium">
                    PDF Document
                  </Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-accent/50 transition-colors">
                    <input
                      id="pdf-upload"
                      type="file"
                      accept=".pdf"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {uploadedFile ? "Change PDF file" : "Click to upload PDF"}
                      </span>
                      <span className="text-xs text-muted-foreground">PDF files only, max 10MB</span>
                    </Label>
                  </div>
                  {uploadedFile && (
                    <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
                      <Check className="w-4 h-4 text-success" />
                      <span className="text-sm text-success-foreground">{uploadedFile.name}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-elegant border-0">
              <CardHeader>
                <CardTitle>Proportion Data</CardTitle>
                <CardDescription>Enter the proportion values for each measurement category</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(proportions).map(([key, value]) => {
                      const isNumericField = ["TD", "TBL", "CA", "PA", "ST", "LH", "depth", "table"].includes(key)

                      return (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={key} className="text-sm font-medium">
                            {key}
                          </Label>
                          <Input
                            id={key}
                            type={isNumericField ? "number" : "text"}
                            step={isNumericField ? "0.01" : undefined}
                            value={value}
                            onChange={(e) => handleProportionChange(key as keyof ProportionData, e.target.value)}
                            placeholder={`Enter ${key} value`}
                            className="transition-all focus:shadow-soft"
                          />
                        </div>
                      )
                    })}

                    <div className="space-y-2">
                      <Label htmlFor="size" className="text-sm font-medium">
                        Size
                      </Label>
                      <Select onValueChange={(val) => handleProportionChange("size", val)} value={proportions.size}>
                        <SelectTrigger id="size" className="w-full">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4 p-4 bg-accent/30 rounded-lg border border-border mt-6">
                    <h3 className="font-semibold text-sm">Report Position Offset (in pixels)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="offset-top" className="text-sm flex items-center gap-2">
                          Up
                        </Label>
                        <Input
                          id="offset-top"
                          type="number"
                          placeholder="0"
                          value={offsetData.top}
                          onChange={(e) => handleOffsetChange("top", parseFloat(e.target.value) || 0)}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="offset-bottom" className="text-sm flex items-center gap-2">
                          Down
                        </Label>
                        <Input
                          id="offset-bottom"
                          type="number"
                          placeholder="0"
                          value={offsetData.bottom}
                          onChange={(e) => handleOffsetChange("bottom", parseFloat(e.target.value) || 0)}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="offset-left" className="text-sm flex items-center gap-2">
                          Left
                        </Label>
                        <Input
                          id="offset-left"
                          type="number"
                          placeholder="0"
                          value={offsetData.left}
                          onChange={(e) => handleOffsetChange("left", parseFloat(e.target.value) || 0)}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="offset-right" className="text-sm flex items-center gap-2">
                          Right
                        </Label>
                        <Input
                          id="offset-right"
                          type="number"
                          placeholder="0"
                          value={offsetData.right}
                          onChange={(e) => handleOffsetChange("right", parseFloat(e.target.value) || 0)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Enter values to move the report. Positive values move right/down, negative values move left/up.</p>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Processing..." : "Submit Report"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === "mini" && <MiniReportsSection />}
      </div>
    </div>
  )
}

export default ReportProcessor
