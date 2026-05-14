import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dettaglio-notizia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dettaglio-notizia.html',
  styleUrl: './dettaglio-notizia.css'
})
export class DettaglioNotizia {

  id: string | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');
    console.log('ID notizia:', this.id);
  }
}