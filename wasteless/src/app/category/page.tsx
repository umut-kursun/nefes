import { Suspense } from "react";
import { CategoryDetailView } from "@/components/category-detail-view";

export default function CategoryPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg p-6 text-sm text-muted-foreground">
          Yükleniyor...
        </div>
      }
    >
      <CategoryDetailView />
    </Suspense>
  );
}
