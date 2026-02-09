import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../state/useAppStore.ts";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridComparatorFn, GridSortDirection, GridSortModel, GridFilterModel, GridEventListener } from "@mui/x-data-grid";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Box } from "@mui/material";
import Colorless from '../assets/energies/colorless.webp'
import Fire from '../assets/energies/fire.webp'
import Water from '../assets/energies/water.webp'
import Grass from '../assets/energies/grass.webp'
import Lightning from '../assets/energies/lightning.webp'
import Psychic from '../assets/energies/psychic.webp'
import Fighting from '../assets/energies/fighting.webp'
import Darkness from '../assets/energies/darkness.webp'
import Metal from '../assets/energies/metal.webp'
import Dragon from '../assets/energies/dragon.webp'


const AUTO_FILTER_ID = "autoSortNotEmpty";

type PokemonRow = {
  id: string;
  localId: string;
  set: {id: string, name: string};
  name: string;
  type: string;
  hp: number;
  highestAtt: number;
  retreat?: number;
  weakness?: {type: string, value: number};
  image: string;
  category: "Pokemon" | "Trainer";
  trainerType?: "Item" | "Tool" | "Supporter" | "Stadium";
  description: string;
  rarity: string;
  attacks: {name: string, effect: string, cost: string[]}[];
  abilities: {name: string, effect: string, type: string}[];
};

const typeImages = {
  Colorless: Colorless,
  Fire: Fire,
  Water: Water,
  Grass: Grass,
  Lightning: Lightning,
  Psychic: Psychic,
  Fighting: Fighting,
  Darkness: Darkness,
  Metal: Metal,
  Dragon: Dragon,
};

export function DeckBuilder() {
    const [rows, setRows] = useState<PokemonRow[]>([]);
    const [selectedCard, setSelectedCard] = useState<PokemonRow | null>(null);
    useEffect(() => {
        fetch("http://localhost:3001/api/cards")
        .then(res => res.json())
        .then(data => {
            console.log(data);
            setRows(data);
        });
    }, []);

  return (
    <div>
      <h2>Deck Builder</h2>
      <div style={{ display: "flex", flexDirection: "row", gap: 25 }}>
        <img height={300} width={200} style={{ backgroundColor: "#808080", borderRadius: 10 }} src={selectedCard?.image ? `${selectedCard.image}/low.webp` : ""} />
        {selectedCard && <div className="card-details">
          <h4>
            <span style={{ fontWeight: "bold" }}>{selectedCard?.name}</span>
            <span style={{ fontWeight: "normal", marginLeft: 30 }}>
              <span style={{ fontSize: "10px", fontWeight: "bold" }}>HP:</span> {selectedCard?.hp}
              <img style={{ marginLeft: 7 }} height={15} width={15} src={typeImages[selectedCard?.type as keyof typeof typeImages]} alt={selectedCard?.type} />
            </span>
          </h4>
          {selectedCard?.abilities.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: "bold" }}>Ability: {selectedCard?.abilities[0].name}</span>
            <span style={{ fontSize: "14px" }}>{selectedCard?.abilities[0].effect}</span>
            </div>}
          <p><span style={{ fontWeight: "bold" }}>Attacks:</span></p>
          {selectedCard?.attacks.map(attack => <p>{attack.cost.map((energy, i) => <img style={{ marginRight: 2 }} key={energy + i} height={15} width={15} src={typeImages[energy as keyof typeof typeImages]} alt={energy} />)} <span style={{ fontWeight: "bold" }}>{attack.name}</span> {attack.effect ? `- ${attack.effect}` : ""}</p>)}
          {selectedCard?.weakness && <p><span style={{ fontWeight: "bold" }}>Weakness:</span> <img height={15} width={15} src={typeImages[selectedCard?.weakness?.type as keyof typeof typeImages]} alt={selectedCard?.weakness?.type} /></p>}
          <p><span style={{ fontWeight: "bold" }}>Retreat:</span> {selectedCard?.retreat}</p>
        </div>}
      </div>
      <PokemonTable rows={rows} setSelectedCard={setSelectedCard} />
    </div>
  );
}

const rarities = {
    "One Diamond": "◆",
    "Two Diamond": "◆◆",
    "Three Diamond": "◆◆◆",
    "Four Diamond": "◆◆◆◆",
    "One Star": "★",
    "Two Star": "★★",
    "Three Star": "★★★",
    "Crown": "👑",
    "None": "",
    
};

export function PokemonTable({ rows, setSelectedCard }: { rows: PokemonRow[], setSelectedCard: (card: PokemonRow) => void }) {
    const [sortModel, setSortModel] = useState<GridSortModel>([]);
    const [filterModel, setFilterModel] = useState<GridFilterModel>({
        items: [],
        quickFilterValues: [],
      });
    
    const theme = useMemo(
      () =>
          createTheme({
          palette: { mode: "dark" },
          }),
      []
    );

    const getAutoItem = (field?: string) =>
    field
        ? ({ id: AUTO_FILTER_ID, field, operator: "isNotEmpty" } as const)
        : null;

    const handleSortModelChange = (newModel: GridSortModel) => {
      setSortModel(newModel);

      const field = newModel[0]?.field;

      setFilterModel((prev) => {
          const withoutAuto = prev.items.filter((i) => i.id !== AUTO_FILTER_ID);

          if (!field) {
          // sorting cleared -> remove the auto "isNotEmpty" filter, keep search
          return { ...prev, items: withoutAuto };
          }

          return {
          ...prev,
          items: [
              ...withoutAuto,
              { id: AUTO_FILTER_ID, field, operator: "isNotEmpty" },
          ],
          };
      });
    };

    const handleFilterModelChange = (newModel: GridFilterModel) => {
      // keep your AUTO filter even while the user types in the quick filter
      const field = sortModel[0]?.field;
      const auto = getAutoItem(field);
      const withoutAuto = newModel.items.filter((i) => i.id !== AUTO_FILTER_ID);
  
      setFilterModel({
        ...newModel,
        items: auto ? [...withoutAuto, auto] : withoutAuto,
      });
    };
    
    const columns = useMemo<GridColDef<PokemonRow>[]>(() => [
      { field: "id", headerName: "#", type: "string", width: 90 },
      { field: "name", headerName: "Name", minWidth: 155 },
      {
        field: "types",
        headerName: "Type",
        minWidth: 110,
        valueGetter: (_value, row) => row.type,
      },
      { field: "hp", headerName: "HP", type: "number", width: 80, align: "center" },
      { field: "highestDamage", headerName: "Highest Damage", type: "number", width: 155, align: "center" },
      { field: "retreat", headerName: "Retreat", type: "number", width: 90, align: "center" },
      { field: "weakness", headerName: "Weakness", type: "number", width: 135, align: "left",
        valueGetter: (_value, row) => row.weakness?.type,
        getSortComparator: getEmptyLastSortComparator,
      },
      { field: "catagory", headerName: "Catagory", type: "string", width: 135, align: "left",
        valueGetter: (_value, row) => row.category === "Pokemon" ? row.category : row.trainerType,
        getSortComparator: getEmptyLastSortComparator,
      },
      { field: "rarity", headerName: "Rarity", type: "string", width: 135, align: "left",
        valueGetter: (_value, row) => row.rarity ? rarities[row.rarity as keyof typeof rarities] : "",
        getSortComparator: getEmptyLastSortComparator,
      },
      { field: "set.name", headerName: "Set Name", type: "string", width: 150, align: "left",
        valueGetter: (_value, row) => row.set.name ?? "",
      },
    ], []);

    const handleRowClick: GridEventListener<"rowClick"> = (params) => {
      console.log("clicked row:", params.row);
      console.log("row id:", params.id);
      setSelectedCard(params.row);
    };
  
    return (
      <Box sx={{ height: 700, width: "95vw" }}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <DataGrid
            rows={rows}
            columns={columns}
            showToolbar
            initialState={{
              sorting: { sortModel: [{ field: "id", sort: "asc" }] },
            }}
            disableRowSelectionOnClick
            pagination
            pageSizeOptions={[25, 50, 100]}
            sortModel={sortModel}
            onSortModelChange={handleSortModelChange}
            filterModel={filterModel}
            onFilterModelChange={handleFilterModelChange}
            disableColumnMenu
            onRowClick={handleRowClick}
            slotProps={{
              toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 250 },
              },
            }}
            sx={{
              "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
                outline: "none",
              },
              "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": {
                outline: "none",
              },
              "& .MuiDataGrid-cell": {
                userSelect: "none",
              },
            }}
            />
        </ThemeProvider>
      </Box>
    );
  }


const emptyLastStringComparator: GridComparatorFn = (v1, v2) => {
  const a = (v1 ?? "").toString().trim();
  const b = (v2 ?? "").toString().trim();

  // treat these as "empty" (remove "N/A" if you don't want that)
  const aEmpty = a === "" || a === "N/A";
  const bEmpty = b === "" || b === "N/A";

  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;   // a goes after b
  if (bEmpty) return -1;  // a goes before b

  return a.localeCompare(b, undefined, { sensitivity: "base" });
};

// keeps empty values LAST even when sorting desc
const getEmptyLastSortComparator =
  (direction: GridSortDirection) =>
  direction === "asc"
    ? emptyLastStringComparator
    : (v1: any, v2: any, p1: any, p2: any) =>
        emptyLastStringComparator(v2, v1, p2, p1);
