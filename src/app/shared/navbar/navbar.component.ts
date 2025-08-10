import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-navbar',
  imports: [],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {
  activeTab = 'text';
  private isBrowser: boolean;
  private scrollListener?: () => void;

  isMobileMenuOpen = false;
  openSubMenus: Set<number> = new Set();
  activeAccordionId: number | null = 0;
  isSticky = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.initScrollListener();
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser && this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
  }

  private initScrollListener(): void {
    this.scrollListener = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      if (scrollTop < 150) {
        this.isSticky = false;
        document.querySelector('.appie-sticky')?.classList.remove('sticky');
      } else {
        this.isSticky = true;
        document.querySelector('.appie-sticky')?.classList.add('sticky');
      }
    };

    window.addEventListener('scroll', this.scrollListener, { passive: true });
  }

  openMobileMenu(): void {
    this.isMobileMenuOpen = true;
    if (this.isBrowser) {
      document.body.style.overflow = 'hidden';
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    this.openSubMenus.clear();
    if (this.isBrowser) {
      document.body.style.overflow = '';
    }
  }
}