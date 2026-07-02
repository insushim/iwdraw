import type { Metadata } from "next";
import { ColoringGallery } from "./coloring-gallery";

export const metadata: Metadata = {
  title: "색칠 도안 고르기",
  description: "로그인 없이 바로 색칠할 수 있는 1000장 이상의 자체 제작 도안.",
};

export default function ColoringPage() {
  return <ColoringGallery />;
}
