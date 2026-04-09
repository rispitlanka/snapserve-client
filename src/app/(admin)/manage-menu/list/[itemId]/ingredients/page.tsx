import MenuItemIngredientsClient from "@/components/admin/MenuItemIngredientsClient";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ itemId: string }>;
};

export const metadata: Metadata = {
  title: "Menu Item Ingredients",
  description: "Add ingredients to menu items and add-ons",
};

export default async function MenuItemIngredientsPage({ params }: PageProps) {
  const { itemId } = await params;
  return <MenuItemIngredientsClient itemId={itemId} />;
}
