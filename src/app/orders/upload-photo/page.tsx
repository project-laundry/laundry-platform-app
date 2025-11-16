'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function UploadPhotoPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Vennligst velg et bilde');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Bildet er for stort. Maksimal størrelse er 10MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraClick = () => {
    // Trigger file input with camera preference
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async () => {
    if (!selectedImage) {
      alert('Vennligst last opp et bilde først');
      return;
    }

    setUploading(true);

    try {
      // TODO: In a real app, upload to backend/storage
      // For now, simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Navigate to dashboard or success page
      router.push('/dashboard?upload=success');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Opplasting feilet. Vennligst prøv igjen.');
    } finally {
      setUploading(false);
    }
  };

  const handleRetake = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Last opp bilde av vaskepose
          </h1>
          <p className="text-gray-600">
            Ta et bilde av vaskepose plassering slik at sjåføren enkelt kan finne den
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-900 mb-2">Tips for et godt bilde:</h2>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Sørg for god belysning</li>
            <li>• Ta bildet fra avstand så omgivelsene er synlige</li>
            <li>• Vis tydelig hvor posen er plassert (ved døren, i gangen, etc.)</li>
            <li>• Inkluder gjenkjennelige detaljer (dørnummer, postkasse, etc.)</li>
          </ul>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          {!selectedImage ? (
            <div className="text-center">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Camera Icon */}
              <div className="mb-6">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
              </div>

              {/* Upload Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleCameraClick}
                  className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Ta bilde med kamera
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-white text-gray-700 font-semibold py-3 px-6 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors"
                >
                  Velg fra galleri
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Image Preview */}
              <div className="mb-4">
                <div className="relative w-full aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={selectedImage}
                    alt="Vaskepose bilde"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleSubmit}
                  disabled={uploading}
                  className="w-full bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Laster opp...' : 'Bekreft og send inn'}
                </button>
                <button
                  onClick={handleRetake}
                  disabled={uploading}
                  className="w-full bg-white text-gray-700 font-semibold py-3 px-6 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Ta nytt bilde
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="text-center text-sm text-gray-500">
          <p>Bildet vil kun brukes for å hjelpe sjåføren med å finne vaskepose</p>
        </div>
      </div>
    </div>
  );
}
