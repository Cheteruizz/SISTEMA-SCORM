import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ScormStateService {
  private projectKey = 'scorm_project_id';
  private manifestKey = 'scorm_manifest_id';
  private orgKey = 'scorm_org_id';
  private versionKey = 'scorm_version';
  private userKey = 'scorm_user_id';

  setUserId(id: number) {
    localStorage.setItem(this.userKey, String(id));
  }

  getUserId(): number | null {
    const value = localStorage.getItem(this.userKey);
    return value ? Number(value) : null;
  }

  setProjectId(id: number) {
    localStorage.setItem(this.projectKey, String(id));
  }

  getProjectId(): number | null {
    const value = localStorage.getItem(this.projectKey);
    return value ? Number(value) : null;
  }

  setManifestId(id: number) {
    localStorage.setItem(this.manifestKey, String(id));
  }

  getManifestId(): number | null {
    const value = localStorage.getItem(this.manifestKey);
    return value ? Number(value) : null;
  }

  setOrganizationId(id: number) {
    localStorage.setItem(this.orgKey, String(id));
  }

  getOrganizationId(): number | null {
    const value = localStorage.getItem(this.orgKey);
    return value ? Number(value) : null;
  }

  setVersion(version: string) {
    localStorage.setItem(this.versionKey, version);
  }

  getVersion(): string {
    return localStorage.getItem(this.versionKey) || '1.2';
  }

  clearProjectData() {
    localStorage.removeItem(this.projectKey);
    localStorage.removeItem(this.manifestKey);
    localStorage.removeItem(this.orgKey);
    localStorage.removeItem(this.versionKey);
  }

}
