import { FirebaseService } from './firebase_service';

describe('FirebaseService', () => {
  let firebaseService: FirebaseService;

  beforeEach(async () => {
    firebaseService = new FirebaseService();
  });

  it('dummy test', () => {
    expect(firebaseService.createSpot).toBeTruthy();
  });
});
