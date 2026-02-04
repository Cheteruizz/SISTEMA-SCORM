import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ScormService } from '../../../services/scorm.service';
import { ScormStateService } from '../../../services/scorm-state.service';
import { ScormNavComponent } from '../../components/scorm-nav/scorm-nav';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, ScormNavComponent],
  templateUrl: './sequencing-editor.html',
  styleUrls: ['./sequencing-editor.scss'],
})
export class SequencingEditorComponent implements OnInit {
  private scorm = inject(ScormService);
  private state = inject(ScormStateService);
  private toast = inject(ToastService);
  private router = inject(Router);

  items: any[] = [];
  selectedItem: any = null;
  sequencingXml = '';
  navigationXml = '';
  cargando = false;

  ngOnInit() {
    const version = this.state.getVersion();
    if (!version.startsWith('2004')) {
      this.toast.warn('La secuenciacion solo aplica a SCORM 2004.');
      this.router.navigate(['/layout']);
      return;
    }
    const orgId = this.state.getOrganizationId();
    if (!orgId) {
      this.toast.warn('No hay organizacion activa.');
      return;
    }
    this.cargando = true;
    this.scorm.listarItems(orgId).subscribe({
      next: (items) => {
        this.items = items || [];
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.toast.error('No se pudieron cargar los items.');
      },
    });
  }

  seleccionarItem(itemId: string) {
    const id = Number(itemId);
    this.selectedItem = this.items.find((item) => item.id_item === id) || null;
    this.sequencingXml = this.selectedItem?.sequencing_xml || '';
    this.navigationXml = this.selectedItem?.navigation_xml || '';
  }

  aplicarPreset(preset: string) {
    if (!preset) return;
    if (preset === 'free') {
      this.sequencingXml = '';
      this.navigationXml = '';
      return;
    }
    if (preset === 'sequential') {
      this.sequencingXml = `<imsss:sequencing>
  <imsss:controlMode choice="false" flow="true"/>
</imsss:sequencing>`;
      this.navigationXml = '';
      return;
    }
    if (preset === 'completed') {
      this.sequencingXml = `<imsss:sequencing>
  <imsss:controlMode choice="false" flow="true"/>
  <imsss:sequencingRules>
    <imsss:preConditionRule>
      <imsss:ruleConditions conditionCombination="all">
        <imsss:ruleCondition condition="completed" operator="not"/>
      </imsss:ruleConditions>
      <imsss:ruleAction action="skip"/>
    </imsss:preConditionRule>
  </imsss:sequencingRules>
</imsss:sequencing>`;
      this.navigationXml = '';
    }
  }

  guardar() {
    if (!this.selectedItem) return;
    const payload = {
      id_padre: this.selectedItem.id_padre,
      identificador: this.selectedItem.identificador,
      titulo: this.selectedItem.titulo,
      tipo_item: this.selectedItem.tipo_item,
      orden: this.selectedItem.orden,
      es_lanzable: this.selectedItem.es_lanzable,
      id_modulo: this.selectedItem.id_modulo,
      id_leccion: this.selectedItem.id_leccion,
      id_recurso: this.selectedItem.id_recurso,
      sequencing_xml: this.sequencingXml || null,
      navigation_xml: this.navigationXml || null,
    };

    this.scorm.actualizarItem(this.selectedItem.id_item, payload).subscribe({
      next: () => {
        this.toast.success('Secuenciacion actualizada.');
        this.selectedItem.sequencing_xml = this.sequencingXml;
        this.selectedItem.navigation_xml = this.navigationXml;
      },
      error: () => this.toast.error('No se pudo guardar la secuenciacion.'),
    });
  }
}
