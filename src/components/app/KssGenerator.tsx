'use client';

import { Plus, Wand2, Loader2, UploadCloud } from "lucide-react";
import Image from 'next/image';
import * as React from 'react';
import { Card, CardContent } from "@/components/ui/card";
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

// Le composant pour une zone d'upload d'image (maintenant interne à KissGenerator)
function ImageDropzone({ 
    image, 
    setImage, 
    title, 
    isMobile = false 
}: { 
    image: string | null; 
    setImage: (img: string | null) => void; 
    title: string; 
    isMobile?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
    e.target.value = ''; // Permet de re-sélectionner le même fichier
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMobile) return; // Pas de drag & drop sur mobile
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const openFileDialog = () => inputRef.current?.click();

  // Vue Mobile: Boutons carrés côte à côte
  if (isMobile) {
    return (
        <div 
            className="relative aspect-square w-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-2 cursor-pointer hover:border-primary transition-colors bg-white/50"
            onClick={openFileDialog}
        >
            {image ? (
                <Image src={image} alt="Preview" layout="fill" objectFit="cover" className="rounded-md" />
            ) : (
                <>
                    <Plus className="w-8 h-8 text-muted-foreground" />
                    <span className="text-xs text-center text-muted-foreground mt-1">{title}</span>
                </>
            )}
            <input type="file" ref={inputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
        </div>
    );
  }

  // Vue Desktop: Zones de drag-and-drop
  return (
    <Card 
      className="w-full border-2 border-dashed hover:border-primary transition-colors cursor-pointer bg-white/50 shadow-sm"
      onClick={openFileDialog}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <CardContent className="p-4">
        {image ? (
          <div className="relative aspect-square w-full rounded-md overflow-hidden">
            <Image src={image} alt="Uploaded preview" layout="fill" objectFit="cover" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10">
            <UploadCloud className="w-12 h-12 mb-4" />
            <p className="font-semibold">{title}</p>
          </div>
        )}
      </CardContent>
      <input type="file" ref={inputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
    </Card>
  );
}

// Le composant principal qui gère la mise en page
export default function KissGenerator({ 
    image1, setImage1, 
    image2, setImage2, 
    onGenerate, isGenerating, canGenerate 
}: KissGeneratorProps) {
  
  // Détection simple du format mobile (uniquement au chargement)
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const checkMobile = () => window.innerWidth < 768; // 768px est le breakpoint `md` de Tailwind
    setIsMobile(checkMobile());
    
    const handleResize = () => setIsMobile(checkMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-full flex flex-col items-center gap-4 md:gap-6">
        {/* Grille pour les uploads d'image */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs md:max-w-none md:grid-cols-2 md:gap-4">
            <ImageDropzone image={image1} setImage={setImage1} title="Photo of you" isMobile={isMobile} />
            <ImageDropzone image={image2} setImage={setImage2} title="Photo of your crush" isMobile={isMobile} />
        </div>

        {/* Bouton de génération */}
        <Button 
            onClick={onGenerate} 
            disabled={!canGenerate || isGenerating}
            size="lg" 
            className="w-full max-w-xs md:max-w-none text-lg font-semibold bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white disabled:opacity-75 shadow-lg"
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
