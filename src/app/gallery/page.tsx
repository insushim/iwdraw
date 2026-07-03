import type { Metadata } from "next";
import { Suspense } from "react";
import { StudentGallery } from "./student-gallery";

export const metadata: Metadata = {
  title: "우리 반 갤러리",
  description: "선생님이 전시한 우리 반 친구들의 작품을 구경하고 좋아요를 눌러요.",
};

export default function GalleryPage() {
  return (
    <Suspense>
      <StudentGallery />
    </Suspense>
  );
}
