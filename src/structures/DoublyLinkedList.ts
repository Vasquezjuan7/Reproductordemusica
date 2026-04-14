export interface SongData {
  id: string;
  title: string;
  artist: string;
  audioSrc: string;
  coverArt?: string;
  videoSrc?: string;
  duration?: number;
  lyrics?: string;
}

export class SongNode {
  public song: SongData;
  public next: SongNode | null = null;
  public prev: SongNode | null = null;

  constructor(song: SongData) {
    this.song = song;
  }
}

export class DoublyLinkedList {
  public head: SongNode | null = null;
  public tail: SongNode | null = null;
  public currentTrack: SongNode | null = null;
  public size: number = 0;

  constructor() {}

  public addTrackBeginning(song: SongData): void {
    const newNode = new SongNode(song);
    if (!this.head) {
      this.head = newNode;
      this.tail = newNode;
      this.currentTrack = newNode;
    } else {
      newNode.next = this.head;
      this.head.prev = newNode;
      this.head = newNode;
    }
    this.size++;
  }

  public addTrackEnd(song: SongData): void {
    const newNode = new SongNode(song);
    if (!this.tail) {
      this.head = newNode;
      this.tail = newNode;
      if (!this.currentTrack) {
        this.currentTrack = newNode;
      }
    } else {
      this.tail.next = newNode;
      newNode.prev = this.tail;
      this.tail = newNode;
    }
    this.size++;
  }

  public addTrackAtPosition(song: SongData, index: number): boolean {
    if (index < 0 || index > this.size) return false;

    if (index === 0) {
      this.addTrackBeginning(song);
      return true;
    }

    if (index === this.size) {
      this.addTrackEnd(song);
      return true;
    }

    const newNode = new SongNode(song);
    let current = this.head;
    for (let i = 0; i < index; i++) {
        if(current) {
            current = current.next;
        }
    }

    if (current && current.prev) {
      newNode.next = current;
      newNode.prev = current.prev;
      current.prev.next = newNode;
      current.prev = newNode;
      this.size++;
      return true;
    }
    
    return false;
  }

  public removeTrack(songId: string): boolean {
    if (!this.head) return false;

    let current: SongNode | null = this.head;

    while (current) {
      if (current.song.id === songId) {
        // If it's the current track, try moving to the next track before deleting
        if (this.currentTrack === current) {
           if (current.next) {
               this.currentTrack = current.next;
           } else if (current.prev) {
               this.currentTrack = current.prev;
           } else {
               this.currentTrack = null;
           }
        }

        if (current.prev) {
          current.prev.next = current.next;
        } else {
          // Removing head
          this.head = current.next;
        }

        if (current.next) {
          current.next.prev = current.prev;
        } else {
          // Removing tail
          this.tail = current.prev;
        }

        this.size--;
        return true;
      }
      current = current.next;
    }
    return false;
  }

  public nextTrack(): SongNode | null {
    if (this.currentTrack && this.currentTrack.next) {
      this.currentTrack = this.currentTrack.next;
      return this.currentTrack;
    }
    return this.currentTrack; // Alternatively return null if looping isn't enabled
  }

  public prevTrack(): SongNode | null {
    if (this.currentTrack && this.currentTrack.prev) {
      this.currentTrack = this.currentTrack.prev;
      return this.currentTrack;
    }
    return this.currentTrack;
  }

  public moveTrackUp(songId: string): boolean {
    let current = this.head;
    while (current) {
      if (current.song.id === songId) {
        if (!current.prev) return false; // Already at the top

        const prevNode = current.prev;
        const nextNode = current.next;
        const prevPrevNode = prevNode.prev;

        // Detach and reconnect
        prevNode.next = nextNode;
        if (nextNode) nextNode.prev = prevNode;
        else this.tail = prevNode; // prevNode became the new tail

        current.prev = prevPrevNode;
        if (prevPrevNode) prevPrevNode.next = current;
        else this.head = current; // current became the new head

        current.next = prevNode;
        prevNode.prev = current;

        return true;
      }
      current = current.next;
    }
    return false;
  }

  public moveTrackDown(songId: string): boolean {
    let current = this.head;
    while (current) {
      if (current.song.id === songId) {
        if (!current.next) return false; // Already at the bottom

        const nextNode = current.next;
        const prevNode = current.prev;
        const nextNextNode = nextNode.next;

        // Detach and reconnect
        nextNode.prev = prevNode;
        if (prevNode) prevNode.next = nextNode;
        else this.head = nextNode; // nextNode became the new head

        current.next = nextNextNode;
        if (nextNextNode) nextNextNode.prev = current;
        else this.tail = current; // current became the new tail

        nextNode.next = current;
        current.prev = nextNode;

        return true;
      }
      current = current.next;
    }
    return false;
  }

  public toArray(): SongData[] {
    const arr: SongData[] = [];
    let current = this.head;
    while (current) {
      arr.push(current.song);
      current = current.next;
    }
    return arr;
  }

  public reorder(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= this.size || toIndex >= this.size) return;
    
    const arr = this.toArray();
    const currentTrackId = this.currentTrack?.song.id;
    
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, moved);
    
    // Rebuild List
    this.head = null;
    this.tail = null;
    this.size = 0;
    this.currentTrack = null;
    
    arr.forEach(song => {
      this.addTrackEnd(song);
      if (song.id === currentTrackId && this.tail) {
         this.currentTrack = this.tail;
      }
    });
  }
}
