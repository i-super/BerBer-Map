import { FirebaseService } from './firebase_service';

describe('FirebaseService', () => {
  let firebaseService: FirebaseService;

  beforeEach(async () => {
    firebaseService = new FirebaseService();
  });

  it('dummy test', () => {
    // TODO: Ideally we can test firebase operations with the emulator.
    // But the emulator doesn't work with Karma so will need some setup work.
    expect(firebaseService.createOrEditSpot).toBeTruthy();
  });
});
