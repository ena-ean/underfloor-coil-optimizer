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
import type { LoopEntry } from "@/lib/state";
import { formatLengthValue, unitLabel, type UnitSystem } from "@/lib/units";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/ru";
import { hasRooms, loopRoom } from "@/lib/loop-label";

interface LoopDistributionProps {
  loops: LoopEntry[];
  coils: CoilPlan[];
  reserve: number;
  locale: Locale;
  dict: Dictionary;
  units: UnitSystem;
}

/** Which coil each loop ended up in — handy on site. */
export function LoopDistribution({
  loops,
  coils,
  reserve,
  locale,
  dict,
  units,
}: LoopDistributionProps) {
  const coilByLoop = new Map<number, number>();
  const unit = unitLabel(units, dict);
  const showRooms = hasRooms(loops);
  for (const coil of coils) {
    for (const index of coil.loopIndexes) coilByLoop.set(index, coil.index);
  }

  return (
    <Table className="text-xs [&_td]:px-1.5 [&_th]:px-1.5 sm:text-sm sm:[&_td]:px-2 sm:[&_th]:px-2">
      <TableHeader>
        <TableRow>
          <TableHead>{dict.loopsTable.circuit}</TableHead>
          {showRooms ? <TableHead className="hidden sm:table-cell">{dict.loopsTable.room}</TableHead> : null}
          <TableHead className="text-right">{dict.loopsTable.floor}</TableHead>
          <TableHead className="hidden text-right sm:table-cell">{dict.loopsTable.design}</TableHead>
          <TableHead className="text-right">{dict.loopsTable.withReserve}</TableHead>
          <TableHead className="text-right">{dict.loopsTable.coil}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loops.map((loop, index) => {
          const room = loopRoom(loop);
          return (
            <TableRow key={loop.id}>
              <TableCell className="tabular-nums">{index + 1}</TableCell>
              {/* Phones keep the four columns of 1.1.x — the room would push the
                  coil number off screen; the coil cards above still name it. */}
              {showRooms ? (
                <TableCell className="hidden max-w-40 truncate sm:table-cell">
                  {room || dict.loopsTable.unassigned}
                </TableCell>
              ) : null}
              <TableCell className="text-right tabular-nums">{loop.floor}</TableCell>
              <TableCell className="hidden text-right tabular-nums sm:table-cell">
                {formatLengthValue(loop.length, units, locale, 1)} {unit}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatLengthValue(loop.length + reserve, units, locale, 1)} {unit}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {coilByLoop.get(index) ?? dict.loopsTable.unassigned}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
