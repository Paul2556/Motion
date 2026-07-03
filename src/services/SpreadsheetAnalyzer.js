export default class SpreadsheetAnalyzer {
  constructor(worksheet) {
    this.worksheet = worksheet;

    this.MIN_COLUMNS = 4;
    this.MIN_ROWS = 2;

    this.tables = [];
    }
    
  analyze() {
    this.findTables();

    return this.tables.map(table => ({
      ...table,
      columns: this.detectColumns(table)
    }));
  }
    findTables() {
    const visited = new Set();

    for (
      let row = 1;
      row <= this.worksheet.rowCount;
      row++
    ) {
      for (
        let col = 1;
        col <= this.worksheet.columnCount;
        col++
      ) {
        const key = `${row}:${col}`;

        if (visited.has(key))
          continue;

        const cell =
          this.worksheet
            .getRow(row)
            .getCell(col)
            .text
            .trim();

        if (!cell)
          continue;

        const table =
            this.expandTable(
                row,
                col,
                visited
            );

            // Width of the table
            const width =
            table.right - table.left + 1;

            const height =
            table.bottom - table.top + 1;

            if (
            width >= this.MIN_COLUMNS &&
            height >= this.MIN_ROWS
            ) {
            this.tables.push(table);
            }
      }
    }
  }
    expandTable(
    startRow,
    startCol,
    visited
  ) {
    let endCol = startCol;

    while (endCol < this.worksheet.columnCount) {
      const text =
        this.worksheet 
          .getRow(startRow)
          .getCell(endCol + 1)
          .text
          .trim();

      if (!text)
        break;

      endCol++;
    }

    let endRow = startRow;

    while (endRow < this.worksheet.rowCount) {
      let empty = true;

      for (
        let c = startCol;
        c <= endCol;
        c++
      ) {
        if (
          this.worksheet
            .getRow(endRow + 1)
            .getCell(c)
            .text
            .trim()
        ) {
          empty = false;
          break;
        }
      }

      if (empty)
        break;

      endRow++;
    }

    for (
      let r = startRow;
      r <= endRow;
      r++
    ) {
      for (
        let c = startCol;
        c <= endCol;
        c++
      ) {
        visited.add(`${r}:${c}`);
      }
    }

    const cells = [];

    for (let r = startRow; r <= endRow; r++) {
    const row = [];

    for (let c = startCol; c <= endCol; c++) {
        row.push(
        this.worksheet
            .getRow(r)
            .getCell(c)
            .text
            .trim()
        );
    }

    cells.push(row);
    }

    return {
    top: startRow,
    left: startCol,
    bottom: endRow,
    right: endCol,
    cells
    };
  }
    detectColumns(table) {
    return {};
  }
}