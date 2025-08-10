import { Component } from '@angular/core';
import { NavbarComponent } from "../../../shared/navbar/navbar.component";
import { FooterComponent } from "../../../shared/footer/footer.component";

@Component({
  selector: 'app-about-us',
  imports: [NavbarComponent, FooterComponent],
  templateUrl: './about-us.component.html',
  styleUrl: './about-us.component.scss'
})
export class AboutUsComponent {
  isMobileMenuOpen = false;
  openSubMenus: Set<number> = new Set();
  
  openMobileMenu(): void {
    this.isMobileMenuOpen = true;
    document.body.style.overflow = 'hidden';
  }
  
  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    this.openSubMenus.clear();
    document.body.style.overflow = '';
  }
}