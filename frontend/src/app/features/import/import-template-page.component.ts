import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-import-template-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Import Template</h2>
    <p>Upload an Excel template to analyze columns and generate SQL DDL.</p>
    <form (submit)="onSubmit($event)">
      <div>
        <label>Table name</label><br>
        <input [(ngModel)]="tableName" name="tableName" required>
      </div>
      <div>
        <input type="file" (change)="onFileChange($event)">
      </div>
      <button type="submit">Analyze</button>
    </form>
    <pre *ngIf="result">{{result | json}}</pre>
  `
})
export class ImportTemplatePageComponent{
  file?: File;
  tableName = '';
  result: unknown;

  onFileChange(e: Event){
    const input = e.target as HTMLInputElement | null;
    this.file = input?.files?.[0] ?? undefined;
  }
  async onSubmit(e: Event){
    e.preventDefault();
    if(!this.file || !this.tableName){ return; }
    const form = new FormData();
    form.append('file', this.file);
    form.append('tableName', this.tableName);
    const res = await fetch('/api/import/template', { method: 'POST', body: form });
    if(res.ok){ this.result = await res.json(); }
  }
}
