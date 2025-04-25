import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/web/pdf_viewer.css";
import "./PDFHighlighter.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.js";

const references = [
  {
    content:
      "Cigna Dental Preventive Plan If You Wish To Cancel Or If You Have Questions If You are not satisfied, for any reason, with the terms of this Policy You may return it to Us within 10 days of receipt. We will then cancel Your coverage as of the original Effective Date and promptly refund any premium You have paid. This Policy will then be null and void. If You wish to correspond with Us for this or any other reason, write: Cigna Cigna Individual Services P. O. Box 30365 Tampa, FL 33630 1-877-484-5967",
  },
  {
    content:
      "EXCLUSIONS AND LIMITATIONS: WHAT IS NOT COVERED BY THIS POLICY........................................ 11",
  },
  {
    content:
      "Notice Regarding Provider Directories and Provider Networks If Your Plan utilizes a network of Providers, you will automatically and without charge, receive a separate listing of Participating Providers. You may also have access to a list of Providers who participate in the network by visiting www.cigna.com; mycigna.com. Your Participating Provider network consists of a group of local dental practitioners, of varied specialties as well as general practice, who are employed by or contracted with Cigna HealthCare or Cigna Dental Health. Notice Regarding Standard of Care Under state law, Cigna is required to adhere to the accepted standards of care in the administration of health benefits. Failure to adhere to the accepted standards of care may subject Cigna to liability for damages. PLEASE READ THE FOLLOWING IMPORTANT NOTICE",
  },
];

const PDFHighlighter: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const renderTasks = useRef<Record<number, any>>({});
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadPDF = async () => {
      const loadingTask = pdfjsLib.getDocument(
        "/wa-cigna-dental-preventive-policy.pdf"
      );
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);

      const loadedPages = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        loadedPages.push({ pageNum, page });
      }
      setPages(loadedPages);
    };
    loadPDF();
  }, []);

  useEffect(() => {
    const renderPages = async () => {
      for (const { pageNum, page } of pages) {
        const canvas = canvasRefs.current[pageNum];
        if (canvas) {
          const viewport = page.getViewport({ scale: 1.5 });
          const context = canvas.getContext("2d");
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          if (renderTasks.current[pageNum]) {
            renderTasks.current[pageNum].cancel();
          }

          const renderContext = { canvasContext: context!, viewport };
          const renderTask = page.render(renderContext);
          renderTasks.current[pageNum] = renderTask;
          await renderTask.promise;
        }
      }
    };
    renderPages();
  }, [pages]);

  const highlightText = async (text: string, index: number) => {
    setSelectedIndex(index);
    document.querySelectorAll(".highlight").forEach((el) => el.remove());

    for (const { pageNum, page } of pages) {
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.5 });
      const items = textContent.items as any[];

      let fullText = "";
      let map: { start: number; end: number; item: any }[] = [];

      for (const item of items) {
        const itemText = (item.str || "").replace(/\s+/g, "");
        const start = fullText.length;
        fullText += itemText;
        const end = fullText.length;
        map.push({ start, end, item });
      }

      const searchText = text.replace(/\s+/g, "");
      const startIndex = fullText.indexOf(searchText);

      if (startIndex !== -1) {
        const endIndex = startIndex + searchText.length;

        const highlightItems = map.filter(({ start, end }) => {
          return !(end < startIndex || start > endIndex);
        });

        let minY = Infinity,
          maxY = -Infinity;

        highlightItems.forEach(({ item }) => {
          const tx = pdfjsLib.Util.transform(
            viewport.transform,
            item.transform
          );
          const y = tx[5] - item.height;
          const h = item.height;

          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y + h);
        });

        const canvas = canvasRefs.current[pageNum];
        const pageWidth = canvas?.width || 0;

        const highlight = document.createElement("div");
        highlight.className = "highlight";
        Object.assign(highlight.style, {
          position: "absolute",
          backgroundColor: "yellow",
          opacity: "0.4",
          left: `0px`,
          top: `${minY}px`,
          width: `${pageWidth}px`,
          height: `${maxY - minY}px`,
        });

        const pageDiv = document.getElementById(`page-${pageNum}`);
        pageDiv?.appendChild(highlight);

        document
          .getElementById(`page-${pageNum}`)
          ?.scrollIntoView({ behavior: "smooth" });
        break;
      }
    }
  };

  return (
    <div style={{ display: "flex" }}>
      <aside
        style={{
          width: "320px",
          padding: "1rem",
          overflowY: "auto",
          height: "100vh",
          backgroundColor: "#f7f9fc",
          borderRight: "1px solid #ccc",
        }}
      >
        <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "#333" }}>
          References
        </h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {references.map((ref, idx) => (
            <li
              key={idx}
              onClick={() => highlightText(ref.content, idx)}
              className={`reference-item ${
                selectedIndex === idx ? "selected" : ""
              }`}
              style={{
                marginBottom: "0.75rem",
                padding: "0.75rem",
                border:
                  selectedIndex === idx
                    ? "2px solid #007bff"
                    : "1px solid #ddd",
                borderRadius: "8px",
                backgroundColor: selectedIndex === idx ? "#fff9c4" : "#fff",
                cursor: "pointer",
                fontSize: "0.85rem",
                color: "#333",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                lineHeight: 1.4,
                maxHeight: "140px",
                overflowY: "auto",
              }}
            >
              {ref.content}
            </li>
          ))}
        </ul>
      </aside>

      <div
        ref={containerRef}
        style={{ overflowY: "scroll", height: "100vh", width: "100%" }}
      >
        {pages.map(({ pageNum }) => (
          <div
            key={pageNum}
            id={`page-${pageNum}`}
            style={{ position: "relative" }}
          >
            <canvas
              ref={(el) => {
                canvasRefs.current[pageNum] = el;
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PDFHighlighter;
