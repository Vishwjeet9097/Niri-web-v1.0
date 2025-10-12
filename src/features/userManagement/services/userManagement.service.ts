export interface NodalOfficer {
  id: string;
  firstName: string;
  lastName: string;
  contactNumber: string;
  email: string;
  password?: string;
  role: string;
  state: string;
  assignedIndicator?: string;
  createdAt: number;
}

const STORAGE_KEY = "niri_nodal_officers";

class UserManagementService {
  private getOfficersFromStorage(): NodalOfficer[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return [];
    }
  }

  private saveOfficersToStorage(officers: NodalOfficer[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(officers));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }

  getOfficers(state: string): NodalOfficer[] {
    const allOfficers = this.getOfficersFromStorage();
    return allOfficers.filter((officer) => officer.state === state);
  }

  addOfficer(officer: Omit<NodalOfficer, "id" | "createdAt">): NodalOfficer {
    const newOfficer: NodalOfficer = {
      ...officer,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    const allOfficers = this.getOfficersFromStorage();
    allOfficers.push(newOfficer);
    this.saveOfficersToStorage(allOfficers);

    return newOfficer;
  }

  updateOfficer(
    id: string,
    updates: Partial<Omit<NodalOfficer, "id" | "state" | "createdAt">>
  ): void {
    const allOfficers = this.getOfficersFromStorage();
    const index = allOfficers.findIndex((officer) => officer.id === id);

    if (index !== -1) {
      allOfficers[index] = {
        ...allOfficers[index],
        ...updates,
      };
      this.saveOfficersToStorage(allOfficers);
    }
  }

  deleteOfficer(id: string): void {
    const allOfficers = this.getOfficersFromStorage();
    const filtered = allOfficers.filter((officer) => officer.id !== id);
    this.saveOfficersToStorage(filtered);
  }

  deleteAllOfficers(state: string): void {
    const allOfficers = this.getOfficersFromStorage();
    const filtered = allOfficers.filter((officer) => officer.state !== state);
    this.saveOfficersToStorage(filtered);
  }

  assignIndicator(id: string, indicator: string): void {
    this.updateOfficer(id, { assignedIndicator: indicator });
  }
}

export const userManagementService = new UserManagementService();
