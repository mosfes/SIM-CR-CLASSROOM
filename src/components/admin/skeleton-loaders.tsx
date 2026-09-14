import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 4-Card Stats Skeleton for Admin Dashboard Overview
 */
export function OverviewStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-5"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-16 sm:w-20 rounded-md" />
            <Skeleton className="h-7 w-7 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl" />
          </div>
          <div className="mt-3 sm:mt-4 flex items-baseline gap-2">
            <Skeleton className="h-6 sm:h-8 w-14 sm:w-20 rounded-lg" />
            <Skeleton className="h-3 w-6 rounded-md" />
          </div>
          <div className="mt-3 hidden sm:flex items-center justify-between border-t border-slate-100 pt-3">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-3 w-3 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 3-Card Stats Skeleton for Students, Admins, Diseases
 */
export function TripleStatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-5 shadow-xs"
        >
          <Skeleton className="h-8 w-8 sm:h-14 sm:w-14 shrink-0 rounded-xl sm:rounded-2xl" />
          <div className="space-y-1 sm:space-y-2 w-full">
            <Skeleton className="h-2.5 sm:h-3 w-12 sm:w-16 rounded-md" />
            <Skeleton className="h-5 sm:h-7 w-10 sm:w-16 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Table Skeleton for Admin Overview
 */
export function OverviewTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-6 py-3.5 whitespace-nowrap">ประเภท</th>
            <th className="px-6 py-3.5 whitespace-nowrap">รหัส / Username</th>
            <th className="px-6 py-3.5 whitespace-nowrap">ชื่อ-สกุล</th>
            <th className="px-6 py-3.5 whitespace-nowrap">สถานะ</th>
            <th className="px-6 py-3.5 whitespace-nowrap">วันที่เพิ่ม</th>
            <th className="px-6 py-3.5 text-right whitespace-nowrap">การกระทำ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
              {/* Type Badge */}
              <td className="px-6 py-4 whitespace-nowrap">
                <Skeleton className="h-6 w-20 rounded-lg" />
              </td>
              {/* ID / Username */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-md" />
                  <Skeleton className="h-4 w-24 rounded-md" />
                </div>
              </td>
              {/* Name */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28 rounded-md" />
                    <Skeleton className="h-3 w-16 rounded-md" />
                  </div>
                </div>
              </td>
              {/* Status */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-9 rounded-full" />
                  <Skeleton className="h-4 w-12 rounded-md" />
                </div>
              </td>
              {/* Date */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-3.5 w-3.5 rounded-full" />
                  <Skeleton className="h-3.5 w-20 rounded-md" />
                </div>
              </td>
              {/* Actions */}
              <td className="px-6 py-4 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-1.5">
                  <Skeleton className="h-8 w-8 rounded-xl" />
                  <Skeleton className="h-8 w-8 rounded-xl" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Table Skeleton for Students Page
 */
export function StudentsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="w-full">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-6 py-4 whitespace-nowrap">รหัสนักเรียน</th>
            <th className="px-6 py-4 whitespace-nowrap">ชื่อ-สกุล</th>
            <th className="px-6 py-4 whitespace-nowrap">สถานะ</th>
            <th className="px-6 py-4 whitespace-nowrap">วันที่เพิ่ม</th>
            <th className="px-6 py-4 text-right whitespace-nowrap">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
              {/* Student ID */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-xl" />
                  <Skeleton className="h-4 w-20 rounded-md" />
                </div>
              </td>
              {/* Name */}
              <td className="px-6 py-4 whitespace-nowrap">
                <Skeleton className="h-4 w-32 rounded-md" />
              </td>
              {/* Status */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-9 rounded-full" />
                  <Skeleton className="h-4 w-12 rounded-md" />
                </div>
              </td>
              {/* Date */}
              <td className="px-6 py-4 whitespace-nowrap">
                <Skeleton className="h-3.5 w-24 rounded-md" />
              </td>
              {/* Actions */}
              <td className="px-6 py-4 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-1.5">
                  <Skeleton className="h-8 w-8 rounded-xl" />
                  <Skeleton className="h-8 w-8 rounded-xl" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Table Skeleton for Admins Page
 */
export function AdminsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-6 py-4 whitespace-nowrap">Username</th>
            <th className="px-6 py-4 whitespace-nowrap">ชื่อ-นามสกุล</th>
            <th className="px-6 py-4 whitespace-nowrap">สิทธิ์</th>
            <th className="px-6 py-4 whitespace-nowrap">สถานะ</th>
            <th className="px-6 py-4 whitespace-nowrap">วันที่สร้าง</th>
            <th className="px-6 py-4 text-right whitespace-nowrap">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
              {/* Username */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-24 rounded-md" />
                </div>
              </td>
              {/* Name */}
              <td className="px-6 py-4 whitespace-nowrap">
                <Skeleton className="h-4 w-32 rounded-md" />
              </td>
              {/* Role */}
              <td className="px-6 py-4 whitespace-nowrap">
                <Skeleton className="h-6 w-24 rounded-lg" />
              </td>
              {/* Status */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-9 rounded-full" />
                  <Skeleton className="h-4 w-12 rounded-md" />
                </div>
              </td>
              {/* Date */}
              <td className="px-6 py-4 whitespace-nowrap">
                <Skeleton className="h-3.5 w-24 rounded-md" />
              </td>
              {/* Actions */}
              <td className="px-6 py-4 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-1.5">
                  <Skeleton className="h-8 w-8 rounded-xl" />
                  <Skeleton className="h-8 w-8 rounded-xl" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Table Skeleton for Diseases Page
 */
export function DiseasesTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-6 py-4 whitespace-nowrap">รหัสโรค</th>
            <th className="px-6 py-4 whitespace-nowrap">ชื่อโรค</th>
            <th className="px-6 py-4">อาการ</th>
            <th className="px-6 py-4 whitespace-nowrap">สถานะ</th>
            <th className="px-6 py-4 text-right whitespace-nowrap">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
              {/* Disease Code */}
              <td className="px-6 py-4 whitespace-nowrap">
                <Skeleton className="h-6 w-16 rounded-lg" />
              </td>
              {/* Disease Name */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
              </td>
              {/* Symptoms */}
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1.5">
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-5 w-14 rounded-md" />
                </div>
              </td>
              {/* Status */}
              <td className="px-6 py-4 whitespace-nowrap">
                <Skeleton className="h-5 w-16 rounded-full" />
              </td>
              {/* Actions */}
              <td className="px-6 py-4 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-1.5">
                  <Skeleton className="h-8 w-8 rounded-xl" />
                  <Skeleton className="h-8 w-8 rounded-xl" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Full Page Skeleton for Admin Dashboard Overview
 */
export function AdminOverviewSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Hero Banner Skeleton */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-200/90 p-5 sm:p-8 animate-pulse">
        <div className="space-y-2.5 max-w-md">
          <Skeleton className="h-4 w-28 rounded-full bg-slate-300/80" />
          <Skeleton className="h-7 sm:h-9 w-64 rounded-xl bg-slate-300/80" />
          <Skeleton className="h-4 w-72 rounded-lg bg-slate-300/80" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <OverviewStatsSkeleton />

      {/* Main Table Card Skeleton */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {/* Table Filters & Header Bar */}
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-8 w-20 rounded-xl" />
            <Skeleton className="h-8 w-20 rounded-xl" />
            <Skeleton className="h-8 w-20 rounded-xl" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-48 sm:w-64 rounded-xl" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
        </div>

        {/* Table Rows Skeleton */}
        <OverviewTableSkeleton rows={5} />
      </div>
    </div>
  );
}

/**
 * Full Page Skeleton for Students Page
 */
export function StudentsPageSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 sm:h-8 w-44 rounded-xl" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* 3 Stat Cards Skeleton */}
      <TripleStatsSkeleton />

      {/* Main Table Container */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-10 w-full sm:max-w-md rounded-2xl" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-28 rounded-2xl" />
            <Skeleton className="h-10 w-10 rounded-2xl" />
          </div>
        </div>
        <StudentsTableSkeleton rows={6} />
      </div>
    </div>
  );
}

/**
 * Full Page Skeleton for Admins Page
 */
export function AdminsPageSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 sm:h-8 w-44 rounded-xl" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {/* 3 Stat Cards Skeleton */}
      <TripleStatsSkeleton />

      {/* Main Table Container */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-10 w-full sm:max-w-md rounded-2xl" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-28 rounded-2xl" />
            <Skeleton className="h-10 w-10 rounded-2xl" />
          </div>
        </div>
        <AdminsTableSkeleton rows={5} />
      </div>
    </div>
  );
}

/**
 * Full Page Skeleton for Diseases Page
 */
export function DiseasesPageSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 sm:h-8 w-44 rounded-xl" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      {/* 3 Stat Cards Skeleton */}
      <TripleStatsSkeleton />

      {/* Main Table Container */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-10 w-full sm:max-w-md rounded-2xl" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-28 rounded-2xl" />
            <Skeleton className="h-10 w-10 rounded-2xl" />
          </div>
        </div>
        <DiseasesTableSkeleton rows={5} />
      </div>
    </div>
  );
}

/**
 * Table Skeleton for Classrooms Page
 */
export function ClassroomsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-6 py-4 whitespace-nowrap">ชื่อห้องเรียน</th>
            <th className="px-6 py-4 whitespace-nowrap">กลุ่มในห้องเรียน</th>
            <th className="px-6 py-4 whitespace-nowrap">สถานะ</th>
            <th className="px-6 py-4 whitespace-nowrap">วันที่สร้าง</th>
            <th className="px-6 py-4 text-right whitespace-nowrap">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
              {/* Classroom Name & Code */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-7 rounded-xl" />
                    <Skeleton className="h-4 w-32 rounded-md" />
                  </div>
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
              </td>
              {/* Groups preview */}
              <td className="px-6 py-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Skeleton className="h-6 w-16 rounded-lg" />
                  <Skeleton className="h-6 w-20 rounded-lg" />
                  <Skeleton className="h-6 w-14 rounded-lg" />
                </div>
              </td>
              {/* Status */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-9 rounded-full" />
                  <Skeleton className="h-4 w-12 rounded-md" />
                </div>
              </td>
              {/* Date */}
              <td className="px-6 py-4 whitespace-nowrap">
                <Skeleton className="h-3.5 w-24 rounded-md" />
              </td>
              {/* Actions */}
              <td className="px-6 py-4 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-1.5">
                  <Skeleton className="h-8 w-24 rounded-xl" />
                  <Skeleton className="h-8 w-8 rounded-xl" />
                  <Skeleton className="h-8 w-8 rounded-xl" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Grid Skeleton for Classroom Cards
 */
export function ClassroomsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4"
        >
          {/* Card Top */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-36 rounded-lg" />
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>

          {/* Description placeholder */}
          <Skeleton className="h-4 w-full rounded-md" />

          {/* Groups badges placeholder */}
          <div className="rounded-2xl bg-slate-50 p-3 space-y-2 border border-slate-100">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-20 rounded-md" />
              <Skeleton className="h-3.5 w-12 rounded-md" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-6 w-16 rounded-lg" />
              <Skeleton className="h-6 w-20 rounded-lg" />
              <Skeleton className="h-6 w-14 rounded-lg" />
            </div>
          </div>

          {/* Card Footer Button */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <Skeleton className="h-3.5 w-24 rounded-md" />
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Full Page Skeleton for Classrooms Page (Cards View)
 */
export function ClassroomsPageSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 sm:h-8 w-48 rounded-xl" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* 3 Stat Cards Skeleton */}
      <TripleStatsSkeleton />

      {/* Search & Filter Bar Skeleton */}
      <div className="flex flex-col gap-3 p-1 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-full sm:max-w-md rounded-2xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-2xl" />
          <Skeleton className="h-10 w-10 rounded-2xl" />
        </div>
      </div>

      {/* Cards Grid */}
      <ClassroomsGridSkeleton count={6} />
    </div>
  );
}

/**
 * Grid Skeleton for Group Cards Inside a Classroom
 */
export function GroupsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
          </div>
          <Skeleton className="h-3.5 w-3/4 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/**
 * Full Page Skeleton for Classroom Detail & Groups Page
 */
export function ClassroomDetailPageSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>

      {/* Classroom Banner / Header Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-48 rounded-xl" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
              <Skeleton className="h-4 w-64 rounded-md" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="space-y-1">
          <Skeleton className="h-6 w-36 rounded-lg" />
          <Skeleton className="h-4 w-48 rounded-md" />
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      {/* Groups Grid */}
      <GroupsGridSkeleton count={6} />
    </div>
  );
}


