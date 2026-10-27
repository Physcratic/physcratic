import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { sortStandings, type ContestStanding } from "@/lib/contest-demo";
import { cn } from "@/lib/utils";

export function ContestStandings({
  rows,
  problemCount,
}: {
  rows: ContestStanding[];
  problemCount: number;
}) {
  return (
    <Table>
      <TableCaption className="pb-4">
        Sample competitors. Your submissions update only your row in this demo.
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col" className="w-16">
            Rank
          </TableHead>
          <TableHead scope="col">Contestant</TableHead>
          <TableHead scope="col" className="text-right">
            Solved
          </TableHead>
          <TableHead scope="col" className="text-right">
            Points
          </TableHead>
          <TableHead scope="col" className="text-right">
            Penalty
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortStandings(rows).map((row, index) => (
          <TableRow
            key={row.handle}
            className={cn(row.isYou && "bg-accent/50")}
          >
            <TableCell className="tabular-nums">
              <span className="flex items-center gap-2">
                {index + 1}
                {index === 0 && (
                  <Trophy
                    aria-label="First place"
                    className="size-4 text-primary"
                  />
                )}
              </span>
            </TableCell>
            <TableCell>
              <span className="flex items-center gap-2 font-medium">
                {row.handle}
                {row.isYou && <Badge variant="secondary">You</Badge>}
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {row.solved} / {problemCount}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {row.points.toLocaleString("en-US")}
            </TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {row.penalty} min
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
