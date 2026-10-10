export interface FloorInfo {
  id: number;
  slug: string;
  name: string;
  short: string;
  desc: string;
  tableIds: number[];
  isComingSoon?: boolean;
}

export interface TableInfo {
  id: number;
  table_number: string;
  floor: number;
  floor_name: string;
  floor_short: string;
  capacity: number;
  qr_token: string;
  floor_table_num?: number;
}

export const RESTAURANT_FLOORS: FloorInfo[] = [
  {
    id: 1,
    slug: "ground-floor",
    name: "Ground floor",
    short: "GF",
    desc: "Rustic courtyard with wood-fired oven ambiance",
    tableIds: [1, 2, 3],
  },
  {
    id: 2,
    slug: "school-room",
    name: "School room",
    short: "SR",
    desc: "Cozy indoor heritage dining hall",
    tableIds: [4, 5, 6],
  },
  {
    id: 3,
    slug: "balcony",
    name: "Balcony",
    short: "BAL",
    desc: "Enjoy freshly prepared pizzas, Italian-inspired dishes, and your favourite café beverages in a warm, relaxed setting. Perfect for casual dining, catching up with friends, and spending quality time over good food.",
    tableIds: [7, 8],
  },
  {
    id: 4,
    slug: "lower-top",
    name: "Lower top",
    short: "LT",
    desc: "A welcoming space for family gatherings, group dining, and special occasions. Enjoy good food and comfortable seating in a relaxed atmosphere, whether you're meeting friends or celebrating a memorable moment.",
    tableIds: [9, 10],
  },
  {
    id: 5,
    slug: "top-top",
    name: "Top top",
    short: "TT",
    desc: "Highest rooftop with panoramic sunset lake view",
    tableIds: [11, 12, 13],
  },
  {
    id: 6,
    slug: "everest",
    name: "Everest (coming soon)",
    short: "EV",
    desc: "Exclusive top sky deck with 360° views of Old City",
    tableIds: [],
    isComingSoon: true,
  },
];

export const RESTAURANT_TABLES: TableInfo[] = [
  // Floor 1: Ground floor (3 tables: 4-seater, 4-seater, 2-seater)
  {
    id: 1,
    table_number: "Table 1",
    floor_table_num: 1,
    floor: 1,
    floor_name: "Ground floor",
    floor_short: "GF",
    capacity: 4,
    qr_token: "qr_sec_b7ba9c59d35e4074a30034abb48ee0a9",
  },
  {
    id: 2,
    table_number: "Table 2",
    floor_table_num: 2,
    floor: 1,
    floor_name: "Ground floor",
    floor_short: "GF",
    capacity: 4,
    qr_token: "qr_sec_c2a8e419f72b491295e865f12a14e9b2",
  },
  {
    id: 3,
    table_number: "Table 3",
    floor_table_num: 3,
    floor: 1,
    floor_name: "Ground floor",
    floor_short: "GF",
    capacity: 2,
    qr_token: "qr_sec_8d1a3b5c7e9f02468ace13579bdf2468",
  },

  // Floor 2: School room (3 tables: 6-seater, 4-seater, 2-seater)
  {
    id: 4,
    table_number: "Table 1",
    floor_table_num: 1,
    floor: 2,
    floor_name: "School room",
    floor_short: "SR",
    capacity: 6,
    qr_token: "qr_sec_9e2b4c6d8f0a13579bdf2468ace13579",
  },
  {
    id: 5,
    table_number: "Table 2",
    floor_table_num: 2,
    floor: 2,
    floor_name: "School room",
    floor_short: "SR",
    capacity: 4,
    qr_token: "qr_sec_0f3c5d7e9a1b2468ace13579bdf2468a",
  },
  {
    id: 6,
    table_number: "Table 3",
    floor_table_num: 3,
    floor: 2,
    floor_name: "School room",
    floor_short: "SR",
    capacity: 2,
    qr_token: "qr_sec_1a4d6e8f0b2c3579bdf2468ace13579b",
  },

  // Floor 3: Balcony (2 tables: two 2-seaters)
  {
    id: 7,
    table_number: "Table 1",
    floor_table_num: 1,
    floor: 3,
    floor_name: "Balcony",
    floor_short: "BAL",
    capacity: 2,
    qr_token: "qr_sec_2b5e7f9a1c3d468ace13579bdf2468ac",
  },
  {
    id: 8,
    table_number: "Table 2",
    floor_table_num: 2,
    floor: 3,
    floor_name: "Balcony",
    floor_short: "BAL",
    capacity: 2,
    qr_token: "qr_sec_3c6f8a0b2d4e579bdf2468ace13579bd",
  },

  // Floor 4: Lower top (2 tables: 4-seater, 6-seater)
  {
    id: 9,
    table_number: "Table 1",
    floor_table_num: 1,
    floor: 4,
    floor_name: "Lower top",
    floor_short: "LT",
    capacity: 4,
    qr_token: "qr_sec_4d7a9b1c3e5f68ace13579bdf2468ace",
  },
  {
    id: 10,
    table_number: "Table 2",
    floor_table_num: 2,
    floor: 4,
    floor_name: "Lower top",
    floor_short: "LT",
    capacity: 6,
    qr_token: "qr_sec_5e8b0c2d4f6a79bdf2468ace13579bdf",
  },

  // Floor 5: Top top (3 tables: 6-seater, 4-seater, 2-seater)
  {
    id: 11,
    table_number: "Table 1",
    floor_table_num: 1,
    floor: 5,
    floor_name: "Top top",
    floor_short: "TT",
    capacity: 6,
    qr_token: "qr_sec_6f9c1d3e5a7b8ace13579bdf2468ace1",
  },
  {
    id: 12,
    table_number: "Table 2",
    floor_table_num: 2,
    floor: 5,
    floor_name: "Top top",
    floor_short: "TT",
    capacity: 4,
    qr_token: "qr_sec_7a0d2e4f6b8c9bdf2468ace13579bdf2",
  },
  {
    id: 13,
    table_number: "Table 3",
    floor_table_num: 3,
    floor: 5,
    floor_name: "Top top",
    floor_short: "TT",
    capacity: 2,
    qr_token: "qr_sec_8b1e3f5a7c9d0bdf2468ace13579bdf3",
  },
];

/**
 * Returns floor and table information for a given table id (1..13) or number, with optional floorNumber filter.
 */
export function getTableFloor(
  tableIdOrNum: number | string,
  floorNumber?: number
): {
  floor: number;
  name: string;
  short: string;
  capacity?: number;
  table_number: string;
  floor_table_num: number;
} {
  const num =
    typeof tableIdOrNum === "number"
      ? tableIdOrNum
      : parseInt(String(tableIdOrNum).replace(/\D/g, ""), 10) || 1;

  // 1. If explicit floorNumber is given, match by floor and relative table number or id
  if (floorNumber) {
    const floorMatched = RESTAURANT_TABLES.find(
      (t) => t.floor === floorNumber && (t.floor_table_num === num || t.id === num)
    );
    if (floorMatched) {
      return {
        floor: floorMatched.floor,
        name: floorMatched.floor_name,
        short: floorMatched.floor_short,
        capacity: floorMatched.capacity,
        table_number: floorMatched.table_number,
        floor_table_num: floorMatched.floor_table_num || num,
      };
    }
  }

  // 2. Direct lookup by global table ID (1 to 13)
  const idMatched = RESTAURANT_TABLES.find((t) => t.id === num);
  if (idMatched) {
    return {
      floor: idMatched.floor,
      name: idMatched.floor_name,
      short: idMatched.floor_short,
      capacity: idMatched.capacity,
      table_number: idMatched.table_number,
      floor_table_num: idMatched.floor_table_num || 1,
    };
  }

  // Fallbacks if out of bounds
  if (num <= 3) {
    return { floor: 1, name: "Ground floor", short: "GF", capacity: 4, table_number: `Table ${num}`, floor_table_num: num };
  }
  if (num <= 6) {
    const fnum = num - 3;
    const cap = fnum === 1 ? 6 : fnum === 2 ? 4 : 2;
    return { floor: 2, name: "School room", short: "SR", capacity: cap, table_number: `Table ${fnum}`, floor_table_num: fnum };
  }
  if (num <= 8) {
    const fnum = num - 6;
    return { floor: 3, name: "Balcony", short: "BAL", capacity: 2, table_number: `Table ${fnum}`, floor_table_num: fnum };
  }
  if (num <= 10) {
    const fnum = num - 8;
    const cap = fnum === 1 ? 4 : 6;
    return { floor: 4, name: "Lower top", short: "LT", capacity: cap, table_number: `Table ${fnum}`, floor_table_num: fnum };
  }
  if (num <= 13) {
    const fnum = num - 10;
    const cap = fnum === 1 ? 6 : fnum === 2 ? 4 : 2;
    return { floor: 5, name: "Top top", short: "TT", capacity: cap, table_number: `Table ${fnum}`, floor_table_num: fnum };
  }
  return { floor: 6, name: "Everest (coming soon)", short: "EV", capacity: 4, table_number: "Table 1", floor_table_num: 1 };
}

export function getFloorName(floorNumber: number): string {
  const floor = RESTAURANT_FLOORS.find((f) => f.id === floorNumber);
  return floor ? floor.name : `Floor ${floorNumber}`;
}
