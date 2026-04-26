import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Home, ChevronUp, ChevronDown, Hammer, Zap, Droplets, Wind, Flame, Box, Grid, Monitor, Car, ChevronLeft, ChevronRight, Shield, Search, Info, AlertTriangle, Copy, Edit2, Trash2, Plus, Save, Lock, Unlock, ArrowLeft, Wrench, Thermometer, Lightbulb, Paintbrush, Sun, Key, Eye, Power, FileCheck, HardHat, Construction, Ruler, ShieldCheck, ShieldAlert, BrickWall, Trees, Fan, Sparkles, Wifi, WifiOff, Trash, Settings, Check, X, Users, FileText, Image, Cloud, CloudRain, CloudLightning, Snowflake, Umbrella, Compass, MapPin, Clock, Calendar, Activity, Scissors, Heart, AlertCircle, HelpCircle, Ban, LockOpen, Send, Download, Loader2, CheckCircle2, Layers } from 'lucide-angular';
import { TemplateSection } from '../../../../core/models/inspection.interface';

@Component({
  selector: 'app-section-tabs',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './section-tabs.component.html',
  styleUrl: './section-tabs.component.scss'
})
export class SectionTabsComponent implements AfterViewInit {
  @Input({ required: true }) selectedSection!: string;
  @Input() sections: TemplateSection[] = [];
  @Output() sectionChange = new EventEmitter<string>();

  readonly icons: Record<string, any> = {
    Home, ChevronUp, ChevronDown, Hammer, Zap, Droplets, Wind, Flame, Box, Grid, Monitor, Car, ChevronLeft, ChevronRight,
    Shield, Search, Info, AlertTriangle, Copy, Edit2, Trash2, Plus, Save, Lock, Unlock, ArrowLeft, Wrench, Thermometer, Lightbulb, Paintbrush, Sun, Key, Eye, Power, FileCheck, HardHat, Construction, Ruler, ShieldCheck, ShieldAlert, BrickWall, Trees, Fan, Sparkles, Wifi, WifiOff, Trash, Settings, Check, X, Users, FileText, Image, Cloud, CloudRain, CloudLightning, Snowflake, Umbrella, Compass, MapPin, Clock, Calendar, Activity, Scissors, Heart, AlertCircle, HelpCircle, Ban, LockOpen, Send, Download, Loader2, CheckCircle2, Layers
  };

  @ViewChild('scrollArea') scrollArea!: ElementRef<HTMLDivElement>;
  isDragging = false;
  isMouseDown = false;
  isScrollStart = true;
  isScrollEnd = false;
  startX = 0;
  scrollLeft = 0;

  ngAfterViewInit() {
    this.checkScroll();
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScroll();
  }

  checkScroll() {
    if (!this.scrollArea) return;
    const el = this.scrollArea.nativeElement;
    
    // Detection for start (left)
    this.isScrollStart = el.scrollLeft <= 5;
    
    // Detection for end (right)
    this.isScrollEnd = el.scrollWidth <= el.clientWidth || Math.abs(el.scrollWidth - el.scrollLeft - el.clientWidth) <= 5;
  }

  selectSection(section: string) {
    if (this.isDragging) return; // Prevent tab switch if we were actively dragging
    if (this.selectedSection !== section) {
      this.sectionChange.emit(section);
    }
  }

  onMouseDown(e: MouseEvent) {
    this.isMouseDown = true;
    this.isDragging = false;
    this.startX = e.pageX - this.scrollArea.nativeElement.offsetLeft;
    this.scrollLeft = this.scrollArea.nativeElement.scrollLeft;
  }

  onMouseLeave() {
    this.isMouseDown = false;
    this.isDragging = false;
  }

  onMouseUp() {
    this.isMouseDown = false;
    // We delay clearing isDragging to ensure click event is caught and suppressed
    setTimeout(() => {
      this.isDragging = false;
    }, 50);
  }

  onMouseMove(e: MouseEvent) {
    if (!this.isMouseDown) return;
    
    const x = e.pageX - this.scrollArea.nativeElement.offsetLeft;
    
    // Only count as drag if moved more than 5px
    if (Math.abs(x - this.startX) > 5) {
      this.isDragging = true;
      e.preventDefault();
      const walk = (x - this.startX) * 2;
      this.scrollArea.nativeElement.scrollLeft = this.scrollLeft - walk;
    }
  }
}
