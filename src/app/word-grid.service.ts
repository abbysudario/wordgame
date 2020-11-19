import { Injectable } from '@angular/core';
import { WORD_LIST, GRID_WIDTH, GRID_HEIGHT, DIRECTIONS, ALPHABET, GRID_SIZE } from './constants';
import { TileComponent } from './tile/tile.component';
import { ITile , IBoardGenerator, ILocation  } from './word-grid/word-grid.models';

@Injectable({
  providedIn: 'root'
})
export class WordGridService implements IBoardGenerator {
  grid: ITile[][] = []
  
  alphabet: string = ALPHABET
  words: string[] = WORD_LIST
  gridWidth: number = GRID_WIDTH
  gridHeight: number = GRID_HEIGHT
  gridSize: number = GRID_SIZE
  directions: string[] = DIRECTIONS
  
  wordCounter: number = 0

  constructor() { }
  
  generateBoard(gridSize: number, wordList: string[]): ITile[][] {
    this.words = wordList;
    this.gridSize = gridSize;
    this.generateGrid();
    this.placeWord();
    this.fillEmptySpots();
    return this.grid;
  }
  
  // Given the direction calculates the next Square.
  nextTile: object = {
    horizontal: ( indexColumn: number,indexRow: number, distance:number) => ( {indexColumn: indexColumn + distance, indexRow } ),
    vertical: ( indexColumn: number,indexRow: number, distance:number) => ( { indexColumn , indexRow: indexRow  + distance } ),
    diagonal: ( indexColumn: number,indexRow: number, distance:number) => ( { indexColumn: indexColumn + distance, indexRow: indexRow + distance})
  }

  // given the grid dimensions, and the tile position check if the word fits.
  isDirectionValid: object = {
    horizontal: ( width: number, height: number, indexColumn:number, indexRow:number, wordLength:number ) => width >= indexColumn + wordLength,
    vertical: ( width: number, height: number, indexColumn:number, indexRow:number, wordLength:number ) => height >= indexRow + wordLength,
    diagonal: ( width: number, height: number, indexColumn:number, indexRow:number, wordLength:number ) => (width >= indexColumn + wordLength) && (height >= indexRow + wordLength)
  }

  // If the result of isDirectionValid returns false.
  skipTiles: object = {
    horizontal: (indexColumn: number, indexRow: number, wordLength: number) => ({indexColumn: indexColumn = 0, indexRow: indexRow + 1}),
    vertical: (indexColumn: number, indexRow: number, wordLength: number) => ({indexColumn: indexColumn = 0, indexRow: indexRow + 100}),
    diagonal: ( indexColumn:number, indexRow: number, wordLength: number) => ({indexColumn: indexColumn = 0, indexRow: indexRow + 1})
  }
  
  // Generate grid of empty tiles.
  generateGrid(): void {
    for(let i=0; i < this.gridHeight; i++) {
      this.grid.push([]);
      for(let j=0; j< this.gridWidth; j++) {
        this.grid[i].push({letter:'_', isWord: false});
      }
    }
  }
  
  getWord(): string {
    let sortedWords = this.words.sort( (a,b) => b.length - a.length  );
    let getOneWord = sortedWords[this.wordCounter];
    this.wordCounter++;
    return getOneWord;
  }

  // Find all available locations to place the word in every direction.
  getAvailableLocations(word): ILocation[] {

    const locations: ILocation[] = [];
    const wordLength = word.length;
    let biggestOverlap = 0;

    for( let j = 0; j < this.directions.length; j++){

      const direction = this.directions[j];
      const checkDirection = this.isDirectionValid[direction];
      const nextTile = this.nextTile[direction];
      let indexColumn = 0;
      let indexRow = 0; 
      

      while( indexRow < this.gridHeight) {
        // check if the word fits in the space available at all.
        if(checkDirection(this.gridWidth, this.gridHeight, indexColumn, indexRow, wordLength )) {
          // If it fits, check the next tile for the length of the word to make sure words don't overlap.
          let overlap = this.checkForOverlap(word, indexColumn, indexRow, nextTile);

          if(overlap >= biggestOverlap || overlap === 0) {
            biggestOverlap = overlap;
            locations.push({ indexColumn, indexRow, direction, overlap: biggestOverlap});
          }

          indexColumn++;
          if (indexColumn >= this.gridWidth) {
            indexColumn = 0;
            indexRow++;
          }
        } else {
          let skipDirection = this.skipTiles[direction];
          skipDirection = skipDirection(indexColumn, indexRow, wordLength);
          indexColumn = skipDirection.indexColumn;
          indexRow = skipDirection.indexRow;
        }
      }
    }
    return this.optimizeOverlaps(locations, biggestOverlap);
  };

  checkForOverlap( word, indexColumn, indexRow, getNextTile ): number {
    let overlap: number = 0;

    for(let k = 0; k < word.length; k++) {
      let nextTile = getNextTile( indexColumn, indexRow, k );
      let tile = this.grid[nextTile.indexRow][nextTile.indexColumn];

      if (tile.letter === word[k]) {
        overlap++;
      }  else if (tile.letter !== '_') {
        return -1;
      }
    }
    return overlap;
  }

  optimizeOverlaps( locations, biggestOverlap ): ILocation[] {
    let overlapLocations: ILocation[] = []
    for(let [i ,location] of locations.entries()){
      if (location.overlap >= biggestOverlap) {
        overlapLocations.push(location);
      }
    }
    return overlapLocations;
  }

  placeWord(): ITile[][] {
    let length = this.words.length;
    while(length) {
      
      const word: string = this.getWord();
      
      const locations = this.getAvailableLocations(word);
      
      const randomLocation: ILocation = locations[Math.floor(Math.random() * locations.length)];
      
      this.placeWordInGrid( word, randomLocation);

      length--;
    }
    return this.grid;
  }
  
  placeWordInGrid( word: string, randomLocation: ILocation ): void {
    for (let i = 0, length = word.length; i < length; i++) {
      let next = this.nextTile[randomLocation.direction];
      next = next(randomLocation.indexColumn, randomLocation.indexRow, i);
      let tile = this.buildTile(word, next, i);
      this.grid[next.indexRow][next.indexColumn] = tile;
    }
    
  };

  buildTile(word, next, i): ITile {

    if(this.grid[next.indexRow][next.indexColumn].letter === word[i]) {
      let previousLetterPosition = this.grid[next.indexRow][next.indexColumn].letterPosition;
      const tile: ITile = {
        letter: word[i],
        indexRow: next.indexRow,
        indexColumn: next.indexColumn,
        isWord: true, 
        isSelected: false,
        letterPosition: [previousLetterPosition, i]
      };
      return tile;
    } else {
      const tile: ITile = {
        letter: word[i],
        indexRow: next.indexRow,
        indexColumn: next.indexColumn,
        isWord: true, 
        isSelected: false,
        letterPosition: i
      };
      return tile;
    }
  }
  
  fillEmptySpots(): void {
    for(let row of this.grid) {
      let i:number = 0;
      while(i < this.gridWidth) {
        if(row[i].letter === "_") {
          row[i].letter = this.pickRandomLetter();
        }
        i++
      }
    }
  };

  pickRandomLetter(): string {
    const letterIndex = Math.floor(Math.random() * this.alphabet.length);
    const randomLetter = this.alphabet[letterIndex];
    return randomLetter;
  }
};