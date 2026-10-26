"use client";

import type { CoilPlan } from "@/lib/algorithm/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LoopEntry } from "@/lib/calculator-state";
import { formatNumber } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/ru";

interface LoopDistributionProps {
  loops: LoopEntry[];
  coils: CoilPlan[];
  reserve: number;
  locale: Locale;
  dict: Dictionary;
}

/** Which coil each loop ended up in — handy on site. */
export function LoopDistribution({
  loops,
  coils,
  reserve,
  locale,
  dict,
}: LoopDistributionProps) {
  const coilByLoop = new Map<number, number>();
  for (const coil of coils) {
    for (const index of coil.loopIndexes) coilByLoop.set(index, coil.index);
  }

  return (
    <Table className="text-xs [&_td]:px-1.5 [&_th]:px-1.5 sm:text-sm sm:[&_td]:px-2 sm:[&_th]:px-2">
      <TableHeader>
        <TableRow>
          <TableHead>{dict.loopsTable.circuit}</TableHead>
          <TableHead className="text-right">{dict.loopsTable.floor}</TableHead>
          <TableHead className="hidden text-right sm:table-cell">{dict.loopsTable.design}</TableHead>
          <TableHead className="text-right">{dict.loopsTable.withReserve}</TableHead>
          <TableHead className="text-right">{dict.loopsTable.coil}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loops.map((loop, index) => (
          <TableRow key={loop.id}>
            <TableCell className="tabular-nums">{index + 1}</TableCell>
            <TableCell className="text-right tabular-nums">{loop.floor}</TableCell>
            <TableCell className="hidden text-right tabular-nums sm:table-cell">
              {formatNumber(loop.length, locale, 1)} {dict.common.meters}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(loop.length + reserve, locale, 1)} {dict.common.meters}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {coilByLoop.get(index) ?? dict.loopsTable.unassigned}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
