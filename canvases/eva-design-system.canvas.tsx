import { Card, CardBody, CardHeader, Divider, H1, H2, H3, Pill, Stack, Table, Text } from "cursor/canvas";

type ComponentSpec = {
  nom: string;
  usage: string;
  props: string;
  etats: string;
  validation: string;
  accessibilite: string;
  animations: string;
  erreurs: string;
};

const allComponents: ComponentSpec[] = [
  {
    nom: "EmployeeCard",
    usage: "Afficher une vue compacte employe (identite, poste, equipe, statut, actions rapides).",
    props: "employee, variant(compact|full), onOpenProfile, onMessage, selectable, selected.",
    etats: "default, hover, selected, disabled, loading-skeleton.",
    validation: "Verifier presence nom/prenom et identifiant; fallback avatar si image absente.",
    accessibilite: "Carte focusable; actions au clavier; labels explicites pour boutons icone.",
    animations: "Hover elevation legere, skeleton shimmer, transition selection 120ms.",
    erreurs: "Surcharge info dans la card, contraste faible, action primaire ambiguë.",
  },
  {
    nom: "HRForm",
    usage: "Saisie RH (creation collaborateur, avenant, absence, evaluation).",
    props: "schema, values, errors, onChange, onSubmit, onSaveDraft, mode(create|edit|readonly).",
    etats: "idle, dirty, validating, submitting, success, error, readonly.",
    validation: "Client + serveur; champs obligatoires; formats date/email/iban; regles metier.",
    accessibilite: "Associer label/input, aria-describedby erreurs, ordre tab coherent.",
    animations: "Reveal progressif sections, feedback inline sans jump layout.",
    erreurs: "Validation seulement au submit, messages vagues, perte de brouillon.",
  },
  {
    nom: "StatusBadge",
    usage: "Afficher le statut metier (Actif, En attente, Suspendu, Refuse, Archive).",
    props: "status, tone, icon, size(sm|md), outlined.",
    etats: "default, muted, with-icon.",
    validation: "Mapper strictement status->token couleur/texte; fallback Unknown.",
    accessibilite: "Texte lisible sans couleur seule, ratio contraste AA.",
    animations: "Fade in discret sur changement de statut.",
    erreurs: "Trop de variantes non standard, couleurs incoherentes entre ecrans.",
  },
  {
    nom: "DataList",
    usage: "Lister elements RH (documents, demandes, collaborateurs) avec filtres.",
    props: "items, itemKey, renderItem, emptyState, loading, pagination, filters.",
    etats: "loading, empty, partial-error, loaded.",
    validation: "Garantir cle unique itemKey; verifier coherence tri/pagination.",
    accessibilite: "Roles list/listitem, navigation clavier, announce du nombre de resultats.",
    animations: "Lazy appearance, transition filtre 120-180ms.",
    erreurs: "Pas d'etat vide utile, pagination non synchronisee avec filtres.",
  },
  {
    nom: "ValidationModal",
    usage: "Confirmer actions sensibles (suppression, cloture, validation dossier).",
    props: "open, title, body, confirmLabel, cancelLabel, danger, onConfirm, onClose.",
    etats: "closed, open, confirming, success, error.",
    validation: "Obliger double verification pour actions irreversibles.",
    accessibilite: "Focus trap, Esc ferme (si autorise), titre annonce, retour focus declencheur.",
    animations: "Fade + scale subtile (120ms), blocage scroll fond.",
    erreurs: "Modales empilees, CTA non explicite, fermeture accidentelle.",
  },
  {
    nom: "ToastNotification",
    usage: "Informer des resultats actions (succes, erreur, info, warning).",
    props: "tone, title, message, actionLabel, onAction, duration, persistent.",
    etats: "queued, visible, paused-hover, dismissed.",
    validation: "Limiter longueur message; erreur critique en mode persistant.",
    accessibilite: "Zone aria-live (polite/assertive selon gravite), fermeture clavier.",
    animations: "Slide in/out lateral, stacking fluide.",
    erreurs: "Trop de toasts simultanes, disparition trop rapide.",
  },
  {
    nom: "TextInput",
    usage: "Saisie texte standard (nom, email, matricule, recherche).",
    props: "value, onChange, label, placeholder, helperText, error, required, disabled.",
    etats: "default, focus, filled, error, disabled, readonly.",
    validation: "Regex selon type + validation asynchrone si necessaire.",
    accessibilite: "Label visible, aria-invalid sur erreur, hint relie au champ.",
    animations: "Focus ring fluide, apparition message erreur.",
    erreurs: "Placeholders utilises comme labels, erreurs non contextualisees.",
  },
  {
    nom: "DatePicker",
    usage: "Selection date simple ou plage (conges, entree/sortie, entretien).",
    props: "value, onChange, minDate, maxDate, locale, range, disabledDates.",
    etats: "closed, open, selecting, invalid, disabled.",
    validation: "Bornes min/max, plage coherente, blocage weekends/jours feries si requis.",
    accessibilite: "Navigation clavier calendrier, annonces mois/jour, format localise.",
    animations: "Popover doux, surbrillance date selectionnee.",
    erreurs: "Format ambigu, timezone ignoree, selection plage confuse.",
  },
  {
    nom: "MobileDataTable",
    usage: "Presenter donnees tabulaires RH sur petit ecran sans perte de sens.",
    props: "columns, rows, priorityColumns, rowActions, density, expandable.",
    etats: "loading, compact, expanded-row, empty.",
    validation: "Colonnes critiques toujours visibles; contenu long tronque intelligemment.",
    accessibilite: "Mode carte lisible + labels de colonnes repetes pour lecteurs d'ecran.",
    animations: "Expand/collapse ligne, sticky header discret.",
    erreurs: "Table desktop compressee telle quelle, actions hors ecran.",
  },
];

const mvp = [
  "TextInput",
  "DatePicker",
  "HRForm",
  "StatusBadge",
  "EmployeeCard",
  "ValidationModal",
  "ToastNotification",
  "DataList",
  "MobileDataTable",
];

const shared = [
  "Button (primary, secondary, danger, ghost)",
  "IconButton",
  "Typography tokens (title/body/caption)",
  "Spacing & layout primitives (Stack/Row/Grid)",
  "Avatar + initials fallback",
  "EmptyState + Skeleton + ErrorState",
  "FormField wrapper (label, hint, error)",
  "Pagination + FilterBar + SearchInput",
];

export default function EvaDesignSystemCanvas() {
  return (
    <Stack gap={20}>
      <H1>EVA Design System - Composants RH</H1>
      <Text tone="secondary">
        Referentiel UI pour standardiser les parcours employes, managers et equipe RH.
      </Text>

      <Card>
        <CardHeader title="Composants MVP" />
        <CardBody>
          <Stack gap={10}>
            {mvp.map((name) => (
              <Pill key={name} tone="accent">
                {name}
              </Pill>
            ))}
          </Stack>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Composants partages transverses" />
        <CardBody>
          <Stack gap={8}>
            {shared.map((name) => (
              <Text key={name}>{name}</Text>
            ))}
          </Stack>
        </CardBody>
      </Card>

      <Divider />
      <H2>Specification detaillee</H2>
      <Text tone="secondary">
        Chaque composant decompose: usage, props, etats, validation, accessibilite, animations, erreurs frequentes.
      </Text>

      {allComponents.map((component) => (
        <Card key={component.nom}>
          <CardHeader
            title={component.nom}
            trailing={
              <Pill tone="neutral" size="sm">
                RH UI
              </Pill>
            }
          />
          <CardBody>
            <Stack gap={8}>
              <H3>Usage</H3>
              <Text>{component.usage}</Text>
              <H3>Props</H3>
              <Text>{component.props}</Text>
              <H3>Etats</H3>
              <Text>{component.etats}</Text>
              <H3>Validation</H3>
              <Text>{component.validation}</Text>
              <H3>Accessibilite</H3>
              <Text>{component.accessibilite}</Text>
              <H3>Animations</H3>
              <Text>{component.animations}</Text>
              <H3>Erreurs frequentes</H3>
              <Text>{component.erreurs}</Text>
            </Stack>
          </CardBody>
        </Card>
      ))}

      <Divider />
      <H2>Checklist d implementation</H2>
      <Table
        headers={["Axe", "Regle", "Priorite"]}
        rows={[
          ["Design tokens", "Couleurs/espacements centralises, aucune valeur hardcodee.", "Haute"],
          ["A11y", "Navigation clavier + labels + contrastes AA minimum.", "Haute"],
          ["Validation", "Client + serveur avec messages metier explicites.", "Haute"],
          ["Responsive", "Approche mobile-first pour listes/tables/modales.", "Haute"],
          ["Motion", "Animations courtes (120-180ms), jamais bloquantes.", "Moyenne"],
          ["Robustesse", "Etats loading/empty/error pour chaque composant.", "Haute"],
        ]}
      />
    </Stack>
  );
}
