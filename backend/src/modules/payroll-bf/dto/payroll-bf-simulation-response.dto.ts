export class PayrollBfSimulationResponseDto {
  currency!: "XOF";
  legalVersionId!: string;
  grossTaxableXof!: number;
  cnssBaseXof!: number;
  cnssEmployeeXof!: number;
  cnssEmployerXof!: number;
  iutsTaxableBaseXof!: number;
  iutsXof!: number;
  carfoBaseXof!: number;
  carfoEmployeeXof!: number;
  carfoEmployerXof!: number;
  netPayXof!: number;
  smigCompliance!: boolean;
  smigGapXof!: number;
}
