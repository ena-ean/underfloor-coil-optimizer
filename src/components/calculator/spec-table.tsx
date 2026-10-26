"use client";

import type { CoilPlan } from "@/lib/algorithm/types";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, formatNumber, type Currency } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/ru";
import { buildSpec, specTotals } from "@/lib/report/spec";

interface SpecTableProps {
  coils: CoilPlan[];
  locale: Locale;
  dict: Dictionary;
  currency: Currency;
}

export function SpecTable({ coils, locale, dict, currency }: SpecTableProps) {
  const rows = buildSpec(coils);
  const totals = specTotals(rows);
  const meters = (value: number) => formatNumber(value, locale, 1);
  const money = (value: number | null) =>
    value === null ? "—" : formatMoney(value, locale, currency);

  return (
    <Table className="text-xs [&_td]:px-1.5 [&_th]:px-1.5 sm:text-sm sm:[&_td]:px-2 sm:[&_th]:px-2">
      <TableHeader>
        <TableRow>
          <TableHead>{dict.spec.size}</TableHead>
          <TableHead className="text-right">{dict.spec.qty}</TableHead>
          <TableHead className="hidden text-right sm:table-cell">{dict.spec.length}</TableHead>
          <TableHead className="hidden text-right sm:table-cell">{dict.spec.used}</TableHead>
          <TableHead className="text-right">{dict.spec.waste}</TableHead>
          <TableHead className="text-right">{dict.spec.cost}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.size}>
            <TableCell className="font-medium tabular-nums">
              {row.size} {dict.common.meters}
            </TableCell>
            <TableCell className="text-right tabular-nums">{row.count}</TableCell>
            <TableCell className="hidden text-right tabular-nums sm:table-cell">
              {meters(row.length)}
            </TableCell>
            <TableCell className="hidden text-right tabular-nums sm:table-cell">
              {meters(row.used)}
            </TableCell>
            <TableCell className="text-right tabular-nums">{meters(row.waste)}</TableCell>
            <TableCell className="text-right tabular-nums">{money(row.cost)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow className="hover:bg-transparent">
          <TableCell className="font-semibold">{dict.spec.total}</TableCell>
          <TableCell className="text-right tabular-nums">{totals.count}</TableCell>
          <TableCell className="hidden text-right tabular-nums sm:table-cell">
            {meters(totals.length)}
          </TableCell>
          <TableCell className="hidden text-right tabular-nums sm:table-cell">
            {meters(totals.used)}
          </TableCell>
          <TableCell className="text-right tabular-nums">{meters(totals.waste)}</TableCell>
          <TableCell className="text-right tabular-nums">{money(totals.cost)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
