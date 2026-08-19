// admin_panel/src/components/QRCodeScanner.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const QRCodeScanner = ({ onScanSuccess, onScanFailure, scanRegionSize = 250, fps = 10 }) => {
  const scannerRegionId = "html5qr-code-full-region";
  const html5QrCodeRef = useRef(null);
  const [error, setError] = useState(null);

  const startScanner = useCallback(() => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      console.log("Scanner already running or trying to start.");
      return;
    }

    const config = {
      fps: fps,
      qrbox: { width: scanRegionSize, height: scanRegionSize },
      rememberLastUsedCamera: true,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
    };

    html5QrCodeRef.current = new Html5Qrcode(scannerRegionId, { verbose: false });

    html5QrCodeRef.current.start(
      { facingMode: "environment" }, // Préférer la caméra arrière
      config,
      (decodedText, decodedResult) => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop()
            .then(() => onScanSuccess(decodedText, decodedResult))
            .catch(err => {
                console.error("Failed to stop scanner after success:", err);
                // Appeler onScanSuccess quand même, mais logger l'erreur de stop
                onScanSuccess(decodedText, decodedResult);
            });
        }
      },
      (errorMessage) => {
        if (onScanFailure) {
          onScanFailure(errorMessage);
        }
      }
    ).catch((err) => {
      console.error("Failed to start scanner:", err);
      setError(`Erreur au démarrage du scanner: ${err.message}. Vérifiez les permissions de la caméra.`);
      if (onScanFailure) {
        onScanFailure(err.message);
      }
    });
  }, [onScanSuccess, onScanFailure, fps, scanRegionSize]);

  const stopScanner = useCallback(() => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      return html5QrCodeRef.current.stop().catch(err => {
        console.error("Failed to stop html5qrcode scanner:", err);
        // Ne pas rejeter ici pour permettre au cleanup de continuer
      });
    }
    return Promise.resolve();
  }, []);

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  if (error) {
    return <div style={{ color: 'red', padding: '10px', border: '1px solid red', borderRadius: '5px' }}>{error}</div>;
  }

  return (
    <div id="scanner-container" style={{ width: '100%', maxWidth: '500px', margin: 'auto' }}>
      <div id={scannerRegionId}></div>
    </div>
  );
};

export default QRCodeScanner;