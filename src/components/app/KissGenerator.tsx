'use client';

import { Plus, Wand2, Loader2 } from "lucide-react";
import Image from 'next/image';
import * as React from 'react';
import { Button } from "@/components/ui/button";

// Props pour le composant
interface KissGeneratorProps {
  image1: string | null;
  setImage1: (image: string | null) => void;
  image2: string | null;
  setImage2: (image: string | null) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
}

// Le composant pour une zone d'upload d'image (maintenant unifié)
function ImageDropzone({ 
    image, 
    setImage, 
    title
}: { 
    image: string | null; 
    setImage: (img: string | null) => void; 
    title: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const openFileDialog = () => inputRef.current?.click();

  // Vue unifiée pour Mobile et Desktop
  return (
    <div 
        className="relative aspect-square w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-4 cursor-pointer hover:border-pink-500/50 transition-colors bg-white/30"
        onClick={openFileDialog}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
    >
        {image ? (
            <Image src={image} alt="Preview" layout="fill" objectFit="cover" className="rounded-lg" />
        ) : (
            <>
                <Plus className="w-8 h-8 md:w-10 md:h-10 text-slate-500" />
                <span className="text-sm text-center text-slate-500 mt-2 font-medium">{title}</span>
            </>
        )}
        <input type="file" ref={inputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
    </div>
  );
}

// Le composant principal qui gère la mise en page
export default function KissGenerator({ 
    image1, setImage1, 
    image2, setImage2, 
    onGenerate, isGenerating, canGenerate 
}: KissGeneratorProps) {

  return (
    <div className="w-full flex flex-col items-center gap-4 md:gap-6 h-full p-6 bg-white rounded-2xl shadow-lg">
        <div className="w-full flex-grow flex flex-col justify-center">
            {/* Grille pour les uploads d'image */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs md:max-w-sm mx-auto">
                <ImageDropzone image={image1} setImage={setImage1} title="Photo of you" />
                <ImageDropzone image={image2} setImage={setImage2} title="Photo of your crush" />
            </div>
        </div>

        {/* Bouton de génération */}
        <Button 
            onClick={onGenerate} 
            disabled={!canGenerate || isGenerating}
            size="lg" 
            className="w-full max-w-xs md:max-w-sm text-lg font-semibold bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white disabled:opacity-75 shadow-lg"
        >
            {isGenerating ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
                <Wand2 className="mr-2 h-5 w-5" />
            )}
            {isGenerating ? 'Generating...' : 'Generate Kiss'}
        </Button>
    </div>
  );
} 
