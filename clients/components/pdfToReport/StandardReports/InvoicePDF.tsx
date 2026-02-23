/* eslint-disable @typescript-eslint/no-explicit-any */

// InvoicePDF.tsx
import { Document, Page, View, StyleSheet, Text,Image } from "@react-pdf/renderer"
import InvoicePDFSection1 from "./InvoicePDFSection1"
import InvoicePDFSection2 from "./InvoicePDFSection2"
import InvoicePDFSection4 from "./InvoicePDFSection4"
import InvoicePDFSection5 from "./InvoicePDFSection5"
import { Font } from "@react-pdf/renderer"
import InvoicePDFSection3 from "./InvoicePDFSection3"
import { baseFont } from "../PDFStyles"
interface OffsetData {
  top: number
  bottom: number
  left: number
  right: number
}

const dinProRegular = "/fonts/DINPro-Light_13935.ttf"
const dinProBold = "/fonts/DINPro-Medium_13936.ttf"
Font.register({
  family: "DINPro",
  fonts: [
    {
      src: dinProRegular,
      fontWeight: "normal",
    },
    {
      src: dinProBold,
      fontWeight: "bold",
    },
  ],
})

Font.register({
  family: "OCR",
  src: "/fonts/OCR-a___.ttf",
})

Font.register({
  family: "Helvetica-Light",
  src: "/fonts/Helvetica-Light.ttf", // path to your light TTF file
  fontWeight: "light",
})

Font.registerHyphenationCallback((word) => {
  return [word]
})

const styles = StyleSheet.create({
  page: {
    width: 1224,
    height: 792,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#fff",
    flexDirection: "column",
    position: "relative",
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 1224,
    height: 792,
    zIndex: -1,
  },
  titleContainer: {
    width: "100%",
    textAlign: "center",
    paddingTop: "156px",
  },
  titleText: {
    fontFamily: baseFont,
    fontSize: 12,
    color: "#000",
    marginRight: "257px",
  },
  contentRow: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
  },
})

export default function InvoicePDF({ 
  data, 
  size = "17x11",
  offsetData 
}: { 
  data: any
  size?: "17x11" | "14x8.5"
  offsetData?: OffsetData
}) {
  const offsets = offsetData || { top: 0, bottom: 0, left: 0, right: 0 }
  const dimensions = size === "14x8.5" ? { width: 1008, height: 612 } : { width: 1224, height: 792 }

  const titleContainerStyle =
    size === "14x8.5" ? { ...styles.titleContainer, paddingTop: "42px", marginBottom: "4px", marginTop: offsets.top - offsets.bottom, marginLeft: offsets.left - offsets.right } : { ...styles.titleContainer, marginTop: offsets.top - offsets.bottom, marginLeft: offsets.left - offsets.right }

  const contentRowStyle =
    size === "14x8.5" ? { ...styles.contentRow, marginTop: "0px", marginLeft: 25 + (offsets.left - offsets.right), gap: 8 } : { ...styles.contentRow, marginLeft: 112 + (offsets.left - offsets.right) }

  const section1Style =
    size === "14x8.5"
      ? { width: "215px", marginTop: "38px", marginLeft: "-5px" }
      : { width: "215px", marginTop: "42px", marginLeft: "112px" }

  const section4Style =
    size === "14x8.5"
      ? { width: "236px", height: "100%", marginLeft: "36px", marginTop: "23px", position: "relative" as const }
      : { width: "236px", height: "100%", marginLeft: "36px", marginTop: "28px", position: "relative" as const }

  const section5Style =
    size === "14x8.5"
      ? { width: "215px", marginTop: "23px", marginLeft: "16px" }
      : { width: "215px", marginTop: "28px", marginLeft: "14px" }

  const section2Style =
    size === "14x8.5"
      ? { width: "183px", marginLeft: "37px", marginTop: "3px", position: "relative" as const, height: "100%" }
      : { width: "183px", marginLeft: "35px", marginTop: "7px", position: "relative" as const, height: "100%" }

  const diaTextPosition =
    size === "14x8.5"
      ? { position: "absolute" as const, width: 30, height: 20, top: 485.4, left: 229, transform: "rotate(-90deg)" }
      : { position: "absolute" as const, width: 30, height: 20, top: 485.4, left: 231, transform: "rotate(-90deg)" }

  const section3Position =
    size === "14x8.5"
      ? { width: 68, height: 170, position: "absolute" as const, left: "50.5px", top: 416, transform: "rotate(-90deg)" }
      : { width: 68, height: 170, position: "absolute" as const, left: "49.5px", top: 416, transform: "rotate(-90deg)" }

  return (
    <Document>
      <Page
        size={[dimensions.width, dimensions.height]}
        style={{ ...styles.page, width: dimensions.width, height: dimensions.height }}
      >
        {/* <Image src={'/basiSctucutre.jpg'} style={styles.backgroundImage} /> */}
        {/* Title section */}
        <View style={titleContainerStyle}>
          <Text style={styles.titleText}>{data?.GIANATURALDIAMONDGRADINGREPORT?.GIAReportNumber}</Text>
        </View>
        {/* Main content row */}
        <View style={contentRowStyle}>
          <View style={section1Style}>
            <InvoicePDFSection1 data={data} />
          </View>
          <View style={section4Style}>
            <View>
              <View>
                <InvoicePDFSection4 data={data} />
              </View>
              <View style={diaTextPosition}>
                <Text
                  style={{
                    fontFamily: "OCR",
                    fontWeight: "light",
                    fontSize: 7.19,
                    textAlign: "right",
                  }}
                >
                  DIA
                </Text>
              </View>
            </View>
          </View>
          <View style={section5Style}>
            <InvoicePDFSection5 data={data} />
          </View>
          <View style={section2Style}>
            <View>
              <InvoicePDFSection2 data={data} />
            </View>

            <View style={section3Position}>
              <InvoicePDFSection3 data={data} />
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
