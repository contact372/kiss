'use client';

import { Plus, Wand2, Loader2 } from "lucide-react";
import Image from 'next/image';
import * as React from 'react';
import { Button } from "@/components/ui/button";

interface KissGeneratorProps {
  image1: string | null;
  setImage1: (image: string | null) => void;
  image2: string | null;
  setImage2: (image: string | null) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
}

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

  return (
    <div 
        className="relative aspect-square w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-4 cursor-pointer hover:border-pink-500/50 transition-colors bg-white/5"
        onClick={openFileDialog}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
    >
        {image ? (
            <Image src={image} alt="Preview" layout="fill" objectFit="cover" className="rounded-lg" />
        ) : (
            <>
                <Plus className="w-10 h-10 md:w-16 md:h-16 text-slate-400" />
                <span className="text-sm md:text-base text-center text-slate-500 mt-2 font-medium">{title}</span>
            </>
        )}
        <input type="file" ref={inputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
    </div>
  );
}

export default function KissGenerator({ 
    image1, setImage1, 
    image2, setImage2, 
    onGenerate, isGenerating, canGenerate 
}: KissGeneratorProps) {

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 md:gap-6">
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm md:max-w-md">
            <ImageDropzone image={image1} setImage={setImage1} title="Photo of you" />
            <ImageDropzone image={image2} setImage={setImage2} title="Photo of your crush" />
        </div>

        <Button 
            onClick={onGenerate} 
            disabled={!canGenerate || isGenerating}
            size="lg" 
            className="w-full max-w-sm md:max-w-md text-lg font-semibold bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white disabled:opacity-75 shadow-lg md:py-8 md:text-2xl"
        >
            {isGenerating ? (
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            ) : (
                <Wand2 className="mr-2 h-6 w-6" />
            )}
            {isGenerating ? 'Generating...' : 'Generate Kiss'}
        </Button>
    </div>
  );
} 
