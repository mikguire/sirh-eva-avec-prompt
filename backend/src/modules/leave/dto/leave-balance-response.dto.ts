import { ApiProperty } from "@nestjs/swagger";

export class LeaveBalanceSnapshotDto {
  @ApiProperty()
  employeeId!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ description: "Somme des acquisitions mensuelles (jours, arrondi au dixième)." })
  accruedPaidDays!: number;

  @ApiProperty({ description: "Report manuel / exercice précédent (jours)." })
  carriedOverDays!: number;

  @ApiProperty({ description: "Reliquat expiré suite au plafond de report (informatif)." })
  expiredCarryDays!: number;

  @ApiProperty({ description: "Jours ouvrés consommés par demandes approuvées (types qui débitent le solde)." })
  consumedPaidDays!: number;

  @ApiProperty({ description: "reporté + acquis − consommé (approximation V1 hors cas annulation partielle)." })
  availablePaidDays!: number;

  @ApiProperty()
  acquisitionRatePerFullMonth!: number;

  @ApiProperty()
  carryOverEnabled!: boolean;

  @ApiProperty()
  carryOverCapDays!: number;

  @ApiProperty({
    description: "Dernière période mensuelle synchronisée (AAAA-MM).",
    example: "2026-05"
  })
  syncedThroughYearMonth!: string;
}
