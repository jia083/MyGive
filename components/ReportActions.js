import React, { useState } from 'react';
import { FaDownload, FaCloudUploadAlt, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';
import {
  generateDonationReceipt,
  generateCampaignReport,
  generatePlatformReport,
  downloadPDF
} from '../utils/reportGenerator';
import { uploadDocumentToIPFS } from '../utils/ipfs';

/**
 * ReportActions Component
 * Provides buttons to generate, download, and upload reports to IPFS
 */
const ReportActions = ({ type, data, className = '' }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [ipfsHash, setIpfsHash] = useState(null);

  /**
   * Generate and download PDF report
   */
  const handleDownloadReport = async () => {
    setIsGenerating(true);
    try {
      let pdfBlob;
      let filename;

      switch (type) {
        case 'donation':
          pdfBlob = generateDonationReceipt(data);
          filename = `MyGive_Receipt_${data.receiptId || Date.now()}.pdf`;
          break;

        case 'campaign':
          pdfBlob = generateCampaignReport(data);
          filename = `MyGive_Campaign_Report_${data.id || Date.now()}.pdf`;
          break;

        case 'platform':
          pdfBlob = generatePlatformReport(data);
          filename = `MyGive_Platform_Report_${Date.now()}.pdf`;
          break;

        default:
          throw new Error('Invalid report type');
      }

      downloadPDF(pdfBlob, filename);
      toast.success('Report downloaded successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Generate PDF and upload to IPFS
   */
  const handleUploadToIPFS = async () => {
    setIsUploading(true);
    try {
      let pdfBlob;
      let filename;
      let metadata = {};

      switch (type) {
        case 'donation':
          pdfBlob = generateDonationReceipt(data);
          filename = `Receipt_${data.receiptId || Date.now()}.pdf`;
          metadata = {
            reportType: 'donation-receipt',
            txHash: data.txHash,
            campaignId: data.campaignId,
          };
          break;

        case 'campaign':
          pdfBlob = generateCampaignReport(data);
          filename = `Campaign_Report_${data.id || Date.now()}.pdf`;
          metadata = {
            reportType: 'campaign-report',
            campaignId: data.id,
            campaignTitle: data.title,
          };
          break;

        case 'platform':
          pdfBlob = generatePlatformReport(data);
          filename = `Platform_Report_${Date.now()}.pdf`;
          metadata = {
            reportType: 'platform-transparency',
            period: data.period,
          };
          break;

        default:
          throw new Error('Invalid report type');
      }

      const result = await uploadDocumentToIPFS(pdfBlob, filename, metadata);

      if (result.success) {
        setIpfsHash(result.ipfsHash);
        toast.success(
          <div>
            Report uploaded to IPFS!
            <br />
            <a
              href={result.gatewayUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#10B981', textDecoration: 'underline' }}
            >
              View on IPFS
            </a>
          </div>,
          { autoClose: 5000 }
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      toast.error('Failed to upload report to IPFS: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`report-actions ${className}`}>
      <button
        onClick={handleDownloadReport}
        disabled={isGenerating}
        className="btn-report-action btn-download"
      >
        {isGenerating ? (
          <>
            <FaSpinner className="spinning" />
            Generating...
          </>
        ) : (
          <>
            <FaDownload />
            Download Report
          </>
        )}
      </button>

      <button
        onClick={handleUploadToIPFS}
        disabled={isUploading || isGenerating}
        className="btn-report-action btn-upload-ipfs"
      >
        {isUploading ? (
          <>
            <FaSpinner className="spinning" />
            Uploading...
          </>
        ) : ipfsHash ? (
          <>
            <FaCheckCircle />
            Uploaded to IPFS
          </>
        ) : (
          <>
            <FaCloudUploadAlt />
            Upload to IPFS
          </>
        )}
      </button>

      {ipfsHash && (
        <a
          href={`https://gateway.pinata.cloud/ipfs/${ipfsHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ipfs-link"
        >
          View on IPFS →
        </a>
      )}

      <style jsx>{`
        .report-actions {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .btn-report-action {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-report-action:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-download {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          color: white;
        }

        .btn-download:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-upload-ipfs {
          background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
          color: white;
        }

        .btn-upload-ipfs:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .ipfs-link {
          color: #8B5CF6;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          transition: color 0.3s ease;
        }

        .ipfs-link:hover {
          color: #7C3AED;
          text-decoration: underline;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default ReportActions;
