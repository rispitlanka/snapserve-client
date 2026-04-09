"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { getAuthSession, ROLE_DASHBOARD_ROUTE } from "@/lib/auth";
import { listInventoryItems, type InventoryItem } from "@/lib/inventory";
import {
    createMenuAddonIngredient,
    createMenuItemIngredient,
    listMenuAddons,
    listMenuItems,
} from "@/lib/menu";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Props = {
  itemId: string;
};

type IngredientDraftState = {
  ingredientId: string;
  quantity: string;
  unit: string;
};

type AddonIngredientDraftState = IngredientDraftState;

type AddedIngredientRow = {
  rowKey: string;
  targetType: "item" | "addon";
  addonId?: string;
  addonName?: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
};

type MenuItemInfo = {
  id: string;
  name: string;
  sellingPrice: number;
  cost: number;
};

const sortSelectClass =
  "h-10 min-w-[12rem] rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const newRowKey = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());

const emptyIngredientDraft = (): IngredientDraftState => ({
  ingredientId: "",
  quantity: "",
  unit: "",
});

const getValue = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
};

const getNumber = (record: Record<string, unknown>, keys: string[]): number => {
  for (const key of keys) {
    const v = record[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
};

const getSellingPrice = (row: Record<string, unknown>): number => {
  const direct = getNumber(row, [
    "sellingPrice",
    "selling_price",
    "price",
    "salePrice",
    "menuPrice",
    "menu_price",
  ]);
  if (direct !== 0) return direct;
  const variantsRaw = row["varients"] ?? row["variants"];
  if (Array.isArray(variantsRaw) && variantsRaw.length > 0) {
    const first = variantsRaw[0] as Record<string, unknown>;
    const vp = getNumber(first, ["varientPrice", "variantPrice", "price"]);
    if (vp !== 0) return vp;
  }
  return getNumber(row, ["cost"]);
};

const formatMoney = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MenuItemIngredientsClient({ itemId }: Props) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [item, setItem] = useState<MenuItemInfo | null>(null);
  const [addons, setAddons] = useState<{ id: string; name: string }[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  const [menuIngredientDraft, setMenuIngredientDraft] = useState<IngredientDraftState>(emptyIngredientDraft);
  const [selectedAddonId, setSelectedAddonId] = useState("");
  const [addonIngredientDrafts, setAddonIngredientDrafts] = useState<Record<string, AddonIngredientDraftState>>({});
  const [addedIngredients, setAddedIngredients] = useState<AddedIngredientRow[]>([]);

  useEffect(() => {
    const init = async () => {
      const session = getAuthSession();
      if (!session) {
        router.replace("/signin");
        return;
      }
      if (session.user.role !== "admin") {
        router.replace(ROLE_DASHBOARD_ROUTE[session.user.role]);
        return;
      }

      setReady(true);
      setLoading(true);
      try {
        const [itemList, addonList, invList] = await Promise.all([
          listMenuItems(session.accessToken),
          listMenuAddons(session.accessToken),
          listInventoryItems(session.accessToken),
        ]);

        const found = (itemList as unknown[])
          .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
          .map((row) => {
            const id = getValue(row, ["id", "menuItemId", "itemId"]);
            const name = getValue(row, ["name", "title", "itemName"]) || "Unnamed";
            const cost = getNumber(row, ["cost", "baseCost"]);
            const sellingPrice = getSellingPrice(row);
            return { id, name, cost, sellingPrice };
          })
          .find((row) => row.id === itemId);

        if (!found) {
          toast.error("Menu item not found.");
          router.replace("/manage-menu/list");
          return;
        }

        const addonRows = (addonList as unknown[])
          .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
          .map((row) => {
            const id = getValue(row, ["id", "addonId"]);
            if (!id) return null;
            const name = getValue(row, ["name", "addonName"]) || "—";
            return { id, name };
          })
          .filter((a): a is { id: string; name: string } => a !== null);

        setItem(found);
        setAddons(addonRows);
        setInventoryItems(invList);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load ingredient page.");
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [itemId, router]);

  const onPickMenuIngredient = (id: string) => {
    const inv = inventoryItems.find((i) => i.id === id);
    setMenuIngredientDraft((prev) => ({
      ...prev,
      ingredientId: id,
      unit: inv?.unit ?? prev.unit,
    }));
  };

  const onPickAddonIngredient = (addonId: string, id: string) => {
    const inv = inventoryItems.find((i) => i.id === id);
    setAddonIngredientDrafts((prev) => ({
      ...prev,
      [addonId]: {
        ...(prev[addonId] ?? emptyIngredientDraft()),
        ingredientId: id,
        unit: inv?.unit ?? prev[addonId]?.unit ?? "",
      },
    }));
  };

  const addMenuIngredientRow = () => {
    if (!menuIngredientDraft.ingredientId) {
      toast.error("Select an ingredient item.");
      return;
    }
    const qty = Number(menuIngredientDraft.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid quantity.");
      return;
    }
    const unit = menuIngredientDraft.unit.trim();
    if (!unit) {
      toast.error("Select a unit.");
      return;
    }

    const ingredientName =
      inventoryItems.find((inv) => inv.id === menuIngredientDraft.ingredientId)?.name ??
      menuIngredientDraft.ingredientId;

    setAddedIngredients((prev) => [
      ...prev,
      {
        rowKey: newRowKey(),
        targetType: "item",
        ingredientId: menuIngredientDraft.ingredientId,
        ingredientName,
        quantity: qty,
        unit,
      },
    ]);

    setMenuIngredientDraft(emptyIngredientDraft());
  };

  const addAddonIngredientRow = (addonId: string) => {
    const draft = addonIngredientDrafts[addonId] ?? emptyIngredientDraft();

    if (!addonId) {
      toast.error("Select an add-on.");
      return;
    }
    if (!draft.ingredientId) {
      toast.error("Select an ingredient item.");
      return;
    }
    const qty = Number(draft.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid quantity.");
      return;
    }
    const unit = draft.unit.trim();
    if (!unit) {
      toast.error("Select a unit.");
      return;
    }

    const ingredientName =
      inventoryItems.find((inv) => inv.id === draft.ingredientId)?.name ?? draft.ingredientId;
    const addonName = addons.find((a) => a.id === addonId)?.name ?? addonId;

    setAddedIngredients((prev) => [
      ...prev,
      {
        rowKey: newRowKey(),
        targetType: "addon",
        addonId,
        addonName,
        ingredientId: draft.ingredientId,
        ingredientName,
        quantity: qty,
        unit,
      },
    ]);

    setAddonIngredientDrafts((prev) => ({
      ...prev,
      [addonId]: emptyIngredientDraft(),
    }));
  };

  const onSaveIngredients = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addedIngredients.length === 0) {
      toast.error("Add at least one ingredient.");
      return;
    }

    const session = getAuthSession();
    if (!session) {
      toast.error("Session not found.");
      return;
    }

    setSaving(true);
    try {
      for (const row of addedIngredients) {
        const payload = {
          ingredientId: row.ingredientId,
          quantity: row.quantity,
          unit: row.unit,
        };

        if (row.targetType === "addon" && row.addonId) {
          await createMenuAddonIngredient(session.accessToken, itemId, row.addonId, payload);
        } else {
          await createMenuItemIngredient(session.accessToken, itemId, payload);
        }
      }

      toast.success("Ingredients saved.");
      router.push("/manage-menu/list");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save ingredients.");
    } finally {
      setSaving(false);
    }
  };

  const menuAddedIngredients = addedIngredients.filter((row) => row.targetType === "item");
  const addonRows = addedIngredients.filter(
    (row): row is AddedIngredientRow & { addonId: string } => row.targetType === "addon" && Boolean(row.addonId)
  );

  const addonGroupIdSet = new Set<string>();
  if (selectedAddonId) addonGroupIdSet.add(selectedAddonId);
  for (const row of addonRows) addonGroupIdSet.add(row.addonId);

  const addonGroupIds = addons.map((addon) => addon.id).filter((addonId) => addonGroupIdSet.has(addonId));

  if (!ready) return null;

  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Add Ingredient</h1>
        <Button type="button" size="sm" variant="outline" onClick={() => router.push("/manage-menu/list")}>Back</Button>
      </div>

      {loading || !item ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      ) : (
        <form className="space-y-5" onSubmit={onSaveIngredients}>
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Menu Info</h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label>Food Name</Label>
                <Input value={item.name} disabled />
              </div>
              <div>
                <Label>Variant</Label>
                <Input value="Default" disabled />
              </div>
              <div>
                <Label>Variant Price</Label>
                <Input value={formatMoney(item.sellingPrice)} disabled />
              </div>
              <div>
                <Label>Total Cost</Label>
                <Input value={formatMoney(item.cost)} disabled />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800" />

          <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">Add Ingredients</h4>
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-4 lg:items-end">
              <div>
                <Label>Ingredient Item</Label>
                <select
                  value={menuIngredientDraft.ingredientId}
                  onChange={(ev) => onPickMenuIngredient(ev.target.value)}
                  className={sortSelectClass + " w-full"}
                >
                  <option value="">Select Item</option>
                  {inventoryItems.map((inv) => (
                    <option key={inv.id} value={inv.id}>{inv.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  step={0.001}
                  value={menuIngredientDraft.quantity}
                  onChange={(ev) => setMenuIngredientDraft((p) => ({ ...p, quantity: ev.target.value }))}
                  placeholder="0"
                  className="h-10! py-2"
                />
              </div>
              <div>
                <Label>Unit</Label>
                <select
                  value={menuIngredientDraft.unit}
                  onChange={(ev) => setMenuIngredientDraft((p) => ({ ...p, unit: ev.target.value }))}
                  className={sortSelectClass + " w-full"}
                >
                  <option value="">Select Unit</option>
                  {[...new Set(inventoryItems.map((i) => i.unit).filter(Boolean))].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button type="button" size="sm" className="h-10 w-full" onClick={addMenuIngredientRow}>Add</Button>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">Add Ingredients for Addons</h4>
            <div>
              <Label>Select Addon</Label>
              <select
                value={selectedAddonId}
                onChange={(ev) => {
                  const addonId = ev.target.value;
                  setSelectedAddonId(addonId);
                  if (!addonId) return;
                  setAddonIngredientDrafts((prev) => ({
                    ...prev,
                    [addonId]: prev[addonId] ?? emptyIngredientDraft(),
                  }));
                }}
                className={sortSelectClass + " w-full"}
              >
                <option value="">Select Addon</option>
                {addons.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {addonGroupIds.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Select an add-on to add ingredients.</p>
            ) : (
              <div className="space-y-3">
                {addonGroupIds.map((addonId) => {
                  const addonName = addons.find((a) => a.id === addonId)?.name ?? addonId;
                  const addonDraft = addonIngredientDrafts[addonId] ?? emptyIngredientDraft();
                  const rows = addonRows.filter((row) => row.addonId === addonId);

                  return (
                    <div key={addonId} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h5 className="text-sm font-semibold text-gray-800 dark:text-white/90">{addonName}</h5>
                      </div>

                      <div className="grid grid-cols-1 gap-2 lg:grid-cols-4 lg:items-end">
                        <div>
                          <Label>Ingredient Item</Label>
                          <select
                            value={addonDraft.ingredientId}
                            onChange={(ev) => onPickAddonIngredient(addonId, ev.target.value)}
                            className={sortSelectClass + " w-full"}
                          >
                            <option value="">Select Item</option>
                            {inventoryItems.map((inv) => (
                              <option key={inv.id} value={inv.id}>{inv.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="0"
                            step={0.001}
                            value={addonDraft.quantity}
                            onChange={(ev) =>
                              setAddonIngredientDrafts((prev) => ({
                                ...prev,
                                [addonId]: {
                                  ...(prev[addonId] ?? emptyIngredientDraft()),
                                  quantity: ev.target.value,
                                },
                              }))
                            }
                            placeholder="0"
                            className="h-10! py-2"
                          />
                        </div>
                        <div>
                          <Label>Unit</Label>
                          <select
                            value={addonDraft.unit}
                            onChange={(ev) =>
                              setAddonIngredientDrafts((prev) => ({
                                ...prev,
                                [addonId]: {
                                  ...(prev[addonId] ?? emptyIngredientDraft()),
                                  unit: ev.target.value,
                                },
                              }))
                            }
                            className={sortSelectClass + " w-full"}
                          >
                            <option value="">Select Unit</option>
                            {[...new Set(inventoryItems.map((i) => i.unit).filter(Boolean))].map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end">
                          <Button type="button" size="sm" className="h-10 w-full" onClick={() => addAddonIngredientRow(addonId)}>
                            Add
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead>
                            <tr className="text-gray-500 dark:text-gray-400">
                              <th className="pb-2 pr-3 font-medium">Ingredient Name</th>
                              <th className="pb-2 pr-3 font-medium">Quantity</th>
                              <th className="pb-2 pr-3 font-medium">Unit</th>
                              <th className="pb-2 font-medium">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {rows.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-3 text-gray-500">No ingredients added yet</td>
                              </tr>
                            ) : (
                              rows.map((row) => (
                                <tr key={row.rowKey}>
                                  <td className="py-2 pr-3 text-gray-800 dark:text-gray-200">{row.ingredientName}</td>
                                  <td className="py-2 pr-3 text-gray-800 dark:text-gray-200">{row.quantity}</td>
                                  <td className="py-2 pr-3 text-gray-800 dark:text-gray-200">{row.unit}</td>
                                  <td className="py-2">
                                    <button
                                      type="button"
                                      className="text-sm text-red-600 hover:underline dark:text-red-400"
                                      onClick={() =>
                                        setAddedIngredients((prev) => prev.filter((x) => x.rowKey !== row.rowKey))
                                      }
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800" />

          <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">Added Ingredients</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-500 dark:text-gray-400">
                    <th className="pb-2 pr-3 font-medium">Item Name</th>
                    <th className="pb-2 pr-3 font-medium">Quantity</th>
                    <th className="pb-2 pr-3 font-medium">Unit</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {menuAddedIngredients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-3 text-gray-500">No ingredients added yet</td>
                    </tr>
                  ) : (
                    menuAddedIngredients.map((row) => (
                      <tr key={row.rowKey}>
                        <td className="py-2 pr-3 text-gray-800 dark:text-gray-200">{row.ingredientName}</td>
                        <td className="py-2 pr-3 text-gray-800 dark:text-gray-200">{row.quantity}</td>
                        <td className="py-2 pr-3 text-gray-800 dark:text-gray-200">{row.unit}</td>
                        <td className="py-2">
                          <button
                            type="button"
                            className="text-sm text-red-600 hover:underline dark:text-red-400"
                            onClick={() =>
                              setAddedIngredients((prev) => prev.filter((x) => x.rowKey !== row.rowKey))
                            }
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => router.push("/manage-menu/list")}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving..." : "Save Ingredients"}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
