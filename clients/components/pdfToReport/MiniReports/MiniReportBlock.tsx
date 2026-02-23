import { View, Text, StyleSheet } from "@react-pdf/renderer"
import { baseFont } from "./PDFStyles"

import InvoicePDFSectionMini1 from "./InvoicePDFSectionMini1"
import InvoicePDFSectionMini2 from "./InvoicePDFSectionMini2"
import InvoicePDFSectionMini3 from "./InvoicePDFSectionMini3"
import InvoicePDFSectionMini4 from "./InvoicePDFSectionMini4"

interface OffsetData {
  top: number
  bottom: number
  left: number
  right: number
}

const styles = StyleSheet.create({
  block: {
    position: "absolute",
    left: 0,
    width: 1224,
    height: 396,
  },

  titleContainer: {
    width: "100%",
    textAlign: "center",
    paddingTop: "36px",
    left: 39,
  },

  titleText: {
    fontFamily: baseFont,
    fontSize: 11,
    letterSpacing: 0.80,
    color: "#000",
  },

  section1: {
    position: "absolute",
    left: 288,
    width: 208,
    height: 180,
    top: 83,
    alignContent:"center",
    overflow: "hidden",
  },

  section2: {
    position: "absolute",
    left: 491,
    top: 70,
    width: 200,
    overflow: "hidden",
  },

  section3: {
    position: "absolute",
    left: 695,
    top: 287,
    width: 80,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-start",
  },

  section4: {
    position: "absolute",
    left: 790,
    top: 40,
    width: 98,
    overflow: "hidden",
  },

})

export default function MiniReportBlock({
  report,
  top,
  offsetData,
}: {
  report: any
  top: number
  offsetData?: OffsetData
}) {
  const offsets = offsetData || { top: 0, bottom: 0, left: 0, right: 0 }
  
  // Apply left/right offset to the entire block
  const blockLeft = offsets.left - offsets.right
  
  return (
    <View style={[styles.block, { top, left: blockLeft }]}>
      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>{report.GIANATURALDIAMONDGRADINGREPORT?.GIAReportNumber}</Text>
      </View>

      {/* Section 1: Left Text Details */}
      <View style={styles.section1}>
        <InvoicePDFSectionMini1 report={report} />
      </View>

      {/* Section 2: Middle Diagram + Barcode */}
      <View style={styles.section2}>
        <InvoicePDFSectionMini2 report={report} />
      </View>

      {/* Section 3: QR Code */}
      <View style={styles.section3}>
        <InvoicePDFSectionMini3 report={report} />
      </View>

      {/* Section 4: Right Detail Column */}
      <View style={styles.section4}>
        <InvoicePDFSectionMini4 report={report} />
      </View>
    </View>
  )
}
