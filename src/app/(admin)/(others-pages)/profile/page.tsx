import ChangePasswordCard from "@/components/user-profile/ChangePasswordCard";
// import UserAddressCard from "@/components/user-profile/UserAddressCard";
// import UserInfoCard from "@/components/user-profile/UserInfoCard";
import UserMetaCard from "@/components/user-profile/UserMetaCard";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Next.js Profile | SnapServe - Next.js Dashboard Template",
  description:
    "This is Next.js Profile page for SnapServe - Next.js Tailwind CSS Admin Dashboard Template",
};

export default function Profile() {
  return (
    <div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          Profile
        </h3>
        <div className="space-y-6">
          <UserMetaCard />
          {/* <UserInfoCard /> */}
          {/* <UserAddressCard /> */}
          <ChangePasswordCard />
        </div>
        <div className="mt-6 flex items-end justify-start">
          <Link
            href="/profile"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
