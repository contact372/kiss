'use client';

import { UploadCloud } from "lucide-react";
import Image from 'next/image';
import * as React from 'react';
import { Card, CardContent } from "@/components/ui/card";

interface ImageUploaderProps {
  image1: string | null;
  setImage1: (image: string | null) => void;
  image2: string | null;
  setImage2: (image: string | null) => void;
}

function ImageDropzone({ image, setImage, title }: { image: string | null; setImage: (img: string) => void; title: string }) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card 
      className="w-full border-2 border-dashed hover:border-primary transition-colors cursor-pointer"
      onClick={() => inputRef.current?.click()}
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
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
      />
    </Card>
  );
}


export default function ImageUploader({ image1, setImage1, image2, setImage2 }: ImageUploaderProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ImageDropzone image={image1} setImage={setImage1} title="Photo of you" />
        <ImageDropzone image={image2} setImage={setImage2} title="Photo of your crush" />
    </div>
  );
}
